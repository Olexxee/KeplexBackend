// modules/products/product.aggregate.service.js
import { prisma } from "../../config/prisma.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../classes/errorClasses.js";
import { deleteFromCloudinary } from "../../config/cloudinaryService.js";
import * as productDb from "./product.db.js";
import * as categoryDb from "../categories/category.db.js";
import * as brandDb from "../brands/brand.db.js";
import * as collectionDb from "../collections/collection.db.js";
import * as variantService from "../variants/variant.service.js";

// ============================================================================
// HELPERS
// ============================================================================

const normalizeProductPayload = (payload = {}) => {
  const data = { ...payload };

  if ("description" in data) data.description = data.description || null;
  if ("brandId" in data) data.brandId = data.brandId || null;
  if ("collectionId" in data) data.collectionId = data.collectionId || null;
  if ("metadata" in data) data.metadata = data.metadata ?? null;

  return data;
};

const getVariantImages = (variant, allImages = []) => {
  const indexes = Array.isArray(variant?.imageIndexes)
    ? variant.imageIndexes
    : [];

  return indexes
    .filter(
      (idx) => Number.isInteger(idx) && idx >= 0 && idx < allImages.length,
    )
    .map((idx) => allImages[idx]);
};

const validateRelations = async (data) => {
  if (data.categoryId) {
    const category = await categoryDb.findCategoryById(data.categoryId);
    if (!category) throw new BadRequestError("Category does not exist");
    if (!category.isActive) {
      throw new BadRequestError("Cannot assign product to inactive category");
    }
  }

  if (data.brandId) {
    const brand = await brandDb.findBrandById(data.brandId);
    if (!brand) throw new BadRequestError("Brand does not exist");
    if (!brand.isActive) {
      throw new BadRequestError("Cannot assign product to inactive brand");
    }
  }

  if (data.collectionId) {
    const collection = await collectionDb.findCollectionById(data.collectionId);
    if (!collection) throw new BadRequestError("Collection does not exist");
    if (!collection.isActive) {
      throw new BadRequestError("Cannot assign product to inactive collection");
    }
  }
};

const prepareVariants = async (productData, tx = null) => {
  if (!productData.variants?.length) return [];

  const variantsForPreparation = productData.variants.map(
    ({ imageIndexes, variantImages, ...variant }) => variant,
  );

  return variantService.prepareVariants(
    variantsForPreparation,
    {
      productName: productData.name,
      categoryId: productData.categoryId,
    },
    tx,
  );
};

// ============================================================================
// VARIANT CLASSIFICATION
// ============================================================================

/**
 * Classify incoming variants against existing ones.
 *
 * Strict mode: the payload contract is
 *   - No `id`              → create
 *   - `id` present, exists on this product → update
 *   - `id` present, unknown on this product → 400 (never silent create)
 *   - Duplicate `id` in payload → 400
 *   - Existing id absent from payload → delete
 *
 * The "unknown id" case used to fall through to `creates`, which meant a
 * stale or foreign id silently inserted a duplicate variant. It also meant
 * that a frontend bug omitting ids entirely would delete every existing
 * variant and re-create it from scratch, cascading through CartItem,
 * OrderItem, Review, and FulfillmentItem foreign keys. Throwing here
 * converts that class of bug into a clean 400.
 */
const classifyVariants = (existingVariants = [], incomingVariants = []) => {
  const existingById = new Map(existingVariants.map((v) => [v.id, v]));

  const creates = [];
  const updates = [];
  const seenIds = new Set();

  for (const incoming of incomingVariants) {
    if (!incoming.id) {
      creates.push(incoming);
      continue;
    }

    if (seenIds.has(incoming.id)) {
      throw new BadRequestError(
        `Duplicate variant id "${incoming.id}" in payload.`,
      );
    }
    seenIds.add(incoming.id);

    const match = existingById.get(incoming.id);
    if (!match) {
      throw new BadRequestError(
        `Variant "${incoming.id}" does not belong to this product.`,
      );
    }

    updates.push({ existing: match, incoming });
  }

  const deletes = existingVariants.filter((v) => !seenIds.has(v.id));

  return { creates, updates, deletes };
};

// ============================================================================
// VARIANT SYNC (inside transaction, DB-only)
// ============================================================================

/**
 * Apply classified variant changes inside the surrounding transaction.
 *
 * Returns the list of Cloudinary publicIds that are no longer referenced
 * from the DB. The CALLER is responsible for purging them after commit.
 */
const synchronizeVariants = async (productId, classified, tx) => {
  const publicIdsToPurge = [];

  // ── Deletes / deactivations ──────────────────────────────────────────
  for (const variant of classified.deletes) {
    const hasOrderHistory =
      (variant._count?.orderItems ?? 0) > 0 ||
      (variant._count?.fulfillmentItems ?? 0) > 0;

    if (hasOrderHistory) {
      // Preserve FK integrity for order and fulfillment history.
      // Storefront already filters on isActive, so this is a true
      // "remove from catalog" from the customer's point of view.
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { isActive: false },
      });

      // Do NOT collect media for purge — the variant still exists
      // and may be reactivated later with its images intact.
      continue;
    }

    // No history — safe to hard-delete and purge its media.
    for (const media of variant.media || []) {
      if (media.publicId) publicIdsToPurge.push(media.publicId);
    }
    await tx.productVariant.delete({ where: { id: variant.id } });
  }

  // ── Updates ──────────────────────────────────────────────────────────
  for (const { existing, incoming } of classified.updates) {
    const { id: _incomingId, variantImages = [], ...scalarData } = incoming;

    await tx.productVariant.update({
      where: { id: existing.id },
      data: scalarData,
    });

    if (variantImages.length > 0) {
      for (const media of existing.media || []) {
        if (media.publicId) publicIdsToPurge.push(media.publicId);
      }

      await tx.variantMedia.deleteMany({ where: { variantId: existing.id } });

      await tx.variantMedia.createMany({
        data: variantImages.map((img, index) => ({
          variantId: existing.id,
          url: img.url,
          publicId: img.publicId,
          mimeType: img.mimeType ?? null,
          bytes: img.bytes ?? null,
          format: img.format ?? null,
          width: img.width ?? null,
          height: img.height ?? null,
          isPrimary: index === 0,
          sortOrder: index,
        })),
      });
    }
  }

  // ── Creates ──────────────────────────────────────────────────────────
  for (const variant of classified.creates) {
    const { variantImages = [], ...variantData } = variant;

    await tx.productVariant.create({
      data: {
        ...variantData,
        productId,
        media:
          variantImages.length > 0
            ? {
                create: variantImages.map((img, index) => ({
                  url: img.url,
                  publicId: img.publicId,
                  mimeType: img.mimeType ?? null,
                  bytes: img.bytes ?? null,
                  format: img.format ?? null,
                  width: img.width ?? null,
                  height: img.height ?? null,
                  isPrimary: index === 0,
                  sortOrder: index,
                })),
              }
            : undefined,
      },
    });
  }

  return publicIdsToPurge;
};

// ============================================================================
// CREATE
// ============================================================================

export const createProductAggregate = async (payload) => {
  const data = normalizeProductPayload(payload);

  await validateRelations(data);

  const existing = await productDb.findProductBySlug(data.slug);
  if (existing) {
    throw new ConflictError("Product slug already exists");
  }

  const preparedVariants = await prepareVariants(data);

  const {
    variants: incomingVariants = [],
    variantImages = [],
    ...productData
  } = data;

  const variantData = preparedVariants.map((variant, index) => ({
    ...variant,
    media: {
      create: getVariantImages(incomingVariants[index], variantImages).map(
        (img) => ({
          url: img.url,
          publicId: img.publicId,
          mimeType: img.mimeType,
          bytes: img.bytes,
          format: img.format,
          width: img.width,
          height: img.height,
          isPrimary: true,
        }),
      ),
    },
  }));

  const product = await prisma.product.create({
    data: { ...productData, variants: { create: variantData } },
    include: productDb.productDetailInclude,
  });

  return product;
};

export const archiveProductAggregate = async (
  id,
  { reason, archivedBy } = {},
) => {
  const product = await productDb.findProductByIdForAdmin(id);
  if (!product) throw new NotFoundError("Product not found");

  const variantIds = product.variants.map((v) => v.id);

  const hasHistory =
    variantIds.length > 0
      ? (await prisma.orderItem.count({
          where: { variantId: { in: variantIds } },
        })) > 0 ||
        (await prisma.fulfillmentItem.count({
          where: { variantId: { in: variantIds } },
        })) > 0
      : false;

  const restoreUntil = new Date();
  restoreUntil.setDate(restoreUntil.getDate() + 90);

  const mediaToPurge = [];

  await prisma.$transaction(async (tx) => {
    if (hasHistory) {
      await tx.product.update({
        where: { id },
        data: { status: "ARCHIVED" },
      });
    } else {
      for (const variant of product.variants) {
        for (const media of variant.media ?? []) {
          if (media.publicId) mediaToPurge.push(media.publicId);
        }
      }
      await tx.product.delete({ where: { id } });
    }

    await tx.archiveRecord.create({
      data: {
        entityType: "PRODUCT",
        entityId: id,
        snapshot: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            price: v.price,
          })),
          archivedAt: new Date().toISOString(),
        },
        reason: reason ?? null,
        archivedBy: archivedBy ?? null,
        restoreUntil,
      },
    });
  });

  if (mediaToPurge.length) {
    try {
      await deleteFromCloudinary(mediaToPurge);
    } catch (error) {
      console.error("[archiveProduct] Cloudinary purge failed:", error);
    }
  }

  return { archived: true, wasSoftDeleted: hasHistory };
};

export const updateProductScalars = async (id, payload) => {
  const existing = await productDb.findProductBasicById(id);
  if (!existing) throw new NotFoundError("Product not found");

  await validateRelations(payload);

  if (payload.slug && payload.slug !== existing.slug) {
    const conflict = await productDb.findProductBySlug(payload.slug);
    if (conflict && conflict.id !== id) {
      throw new ConflictError("Product slug already exists");
    }
  }

  await productDb.updateProductScalars(id, normalizeProductPayload(payload));
  return productDb.findProductByIdForAdmin(id);
};

// ============================================================================
// UPDATE
// ============================================================================

export const updateProductAggregate = async (id, payload) => {
  // ──────────────────────────────────────────────────────────────────────
  // OUTSIDE TRANSACTION — reads, validation, preparation
  // ──────────────────────────────────────────────────────────────────────

  const product = await productDb.findProductById(id);
  if (!product) throw new NotFoundError("Product not found");

  const data = normalizeProductPayload(payload);

  await validateRelations(data);

  if (data.slug && data.slug !== product.slug) {
    const existing = await productDb.findProductBySlug(data.slug);
    if (existing && existing.id !== id) {
      throw new ConflictError("Product slug already exists");
    }
  }

  const {
    variants: incomingVariants,
    variantImages = [],
    ...productData
  } = data;

  // Simple path: no variant changes
  if (!Array.isArray(incomingVariants)) {
    await productDb.updateProductScalars(id, productData);
    return productDb.findProductById(id);
  }

  // Load ALL variants (active + inactive) for classification. productDetailInclude
  // filters to active-only, so a distinct query is required.
  const existingVariantsForClassification =
    await productDb.findProductVariantsForClassification(id);
  // Prepare variants outside the tx — SKU generation does DB lookups.
  const preparedVariants = await prepareVariants({
    name: data.name ?? product.name,
    categoryId: data.categoryId ?? product.categoryId,
    variants: incomingVariants,
  });

  const variantsWithImages = incomingVariants.map((incoming, index) => ({
    ...preparedVariants[index],
    id: incoming.id,
    variantImages: getVariantImages(incoming, variantImages),
  }));

  const classified = classifyVariants(
    existingVariantsForClassification,
    variantsWithImages,
  );

  // ──────────────────────────────────────────────────────────────────────
  // TRANSACTION — writes only, no network I/O, no redundant reads
  // ──────────────────────────────────────────────────────────────────────

  const publicIdsToPurge = await prisma.$transaction(
    async (tx) => {
      await productDb.updateProductScalars(id, productData, tx);

      return synchronizeVariants(id, classified, tx);
    },
    { timeout: 15_000 },
  );

  // ──────────────────────────────────────────────────────────────────────
  // AFTER COMMIT — best-effort CDN cleanup, then one hydrated read
  // ──────────────────────────────────────────────────────────────────────

  if (publicIdsToPurge.length > 0) {
    try {
      await deleteFromCloudinary(publicIdsToPurge);
    } catch (error) {
      console.error(
        `[updateProductAggregate] Cloudinary purge failed for ${publicIdsToPurge.length} asset(s):`,
        error,
      );
    }
  }

  return productDb.findProductById(id);
};

// ============================================================================
// DELETE
// ============================================================================

export const deleteProductAggregate = async (id) => {
  const product = await productDb.findProductById(id);
  if (!product) throw new NotFoundError("Product not found");

  const variantIds = product.variants.map((variant) => variant.id);

  if (variantIds.length > 0) {
    const [orderItemCount, fulfillmentItemCount] = await Promise.all([
      prisma.orderItem.count({ where: { variantId: { in: variantIds } } }),
      prisma.fulfillmentItem.count({
        where: { variantId: { in: variantIds } },
      }),
    ]);

    if (orderItemCount > 0 || fulfillmentItemCount > 0) {
      throw new ConflictError(
        "This product has existing orders or fulfillments and cannot be deleted. Archive it instead.",
      );
    }
  }

  const mediaToDelete = product.variants.flatMap(
    (variant) => variant.media?.map((media) => media.publicId) ?? [],
  );

  const deletedProduct = await prisma.$transaction((tx) =>
    productDb.deleteProduct(id, tx),
  );

  if (mediaToDelete.length > 0) {
    try {
      await deleteFromCloudinary(mediaToDelete);
    } catch (error) {
      console.error(
        `[deleteProductAggregate] Cloudinary purge failed for ${mediaToDelete.length} asset(s):`,
        error,
      );
    }
  }

  return deletedProduct;
};

// ============================================================================
// STATUS
// ============================================================================

export const updateProductStatusAggregate = async (id, status) => {
  const product = await productDb.findProductById(id);
  if (!product) throw new NotFoundError("Product not found");

  return prisma.$transaction(async (tx) => {
    await productDb.updateProductStatus(id, status, tx);
    return productDb.findProductById(id, tx);
  });
};
