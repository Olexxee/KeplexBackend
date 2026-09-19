// modules/variants/variant.service.js
import { ConflictError, NotFoundError } from "../../classes/errorClasses.js";
import * as variantDb from "./variant.db.js";
import * as productDb from "../products/product.db.js";
import { VariantFactory } from "./variant.factory.js";
import { deleteFromCloudinary } from "../../config/cloudinaryService.js";

// ============================================================================
// MEDIA PURGE (call AFTER transactions commit)
// ============================================================================

/**
 * Best-effort Cloudinary cleanup.
 *
 * Never throws — if the CDN call fails, the DB is already consistent,
 * and orphaned assets can be cleaned by a scheduled job. Failures are
 * logged so they don't hide in silence.
 */
export const purgeMedia = async (publicIds = []) => {
  if (!publicIds.length) return;

  try {
    await deleteFromCloudinary(publicIds);
  } catch (error) {
    console.error(
      `[variant.service] Cloudinary purge failed for ${publicIds.length} asset(s):`,
      error,
    );
  }
};

// ============================================================================
// PREPARATION (no DB writes)
// ============================================================================

export const prepareVariant = async (payload, context = {}, tx = null) => {
  return VariantFactory.buildForCreate(payload, { ...context, tx });
};

export const prepareVariants = async (
  variants = [],
  context = {},
  tx = null,
) => {
  return VariantFactory.buildMany(variants, { ...context, tx });
};

export const updatePreparedVariant = async (
  existingVariant,
  payload,
  context = {},
  tx = null,
) => {
  return VariantFactory.buildForUpdate(existingVariant, payload, {
    ...context,
    tx,
  });
};

// ============================================================================
// CREATE
// ============================================================================

export const createVariant = async (data, tx = null) => {
  const {
    productId,
    variantImages = [],
    imageIndexes,
    ...variantPayload
  } = data;

  const product = await productDb.findProductBasicById(productId, tx);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  if (variantPayload.sku) {
    const existingSku = await variantDb.findVariantBySKU(
      variantPayload.sku,
      tx,
    );
    if (existingSku) {
      throw new ConflictError(
        `Variant SKU already exists: ${variantPayload.sku}`,
      );
    }
  }

  const preparedVariant = await VariantFactory.buildForCreate(variantPayload, {
    productName: product.name,
    categoryId: product.categoryId,
    tx,
  });

  return variantDb.createVariantWithMedia(
    { ...preparedVariant, productId },
    variantImages,
    tx,
  );
};

// ============================================================================
// UPDATE
// ============================================================================

/**
 * Update an existing variant.
 *
 * Returns `{ variant, publicIdsToPurge }`. The caller is responsible
 * for invoking `purgeMedia(publicIdsToPurge)` AFTER any surrounding
 * transaction has committed. This is the whole point: the DB work is
 * atomic and fast; the CDN cleanup is deferred and best-effort.
 */
export const updateVariant = async (id, payload, tx = null) => {
  const variant = await variantDb.findVariantById(id, tx);
  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  const { variantImages, imageIndexes, ...updateData } = payload;

  if (updateData.sku && updateData.sku !== variant.sku) {
    const existingVariant = await variantDb.findVariantBySKU(
      updateData.sku,
      tx,
    );
    if (existingVariant && existingVariant.id !== id) {
      throw new ConflictError("SKU already exists");
    }
  }

  const preparedVariant = await VariantFactory.buildForUpdate(
    variant,
    updateData,
    {
      productName: variant.product.name,
      categoryId: variant.product.categoryId,
      tx,
    },
  );

  const updatedVariant = await variantDb.updateVariant(id, preparedVariant, tx);

  const publicIdsToPurge = [];

  // Replace media only when new images were actually provided.
  // (An empty array means "no change", not "clear all images".)
  if (Array.isArray(variantImages) && variantImages.length > 0) {
    for (const image of variant.media || []) {
      if (image.publicId) publicIdsToPurge.push(image.publicId);
    }

    const replaced = await variantDb.updateVariantMedia(id, variantImages, tx);

    return { variant: replaced, publicIdsToPurge };
  }

  return { variant: updatedVariant, publicIdsToPurge };
};

// ============================================================================
// MEDIA (standalone — used by PATCH /:id/images)
// ============================================================================

export const updateVariantImages = async (id, images = [], tx = null) => {
  const variant = await variantDb.findVariantById(id, tx);
  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  const publicIdsToPurge = (variant.media || [])
    .map((image) => image.publicId)
    .filter(Boolean);

  const updatedVariant = await variantDb.updateVariantMedia(id, images, tx);

  return { variant: updatedVariant, publicIdsToPurge };
};

// ============================================================================
// DELETE
// ============================================================================

export const deleteVariant = async (id, tx = null) => {
  const variant = await variantDb.findVariantById(id, tx);
  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  const publicIdsToPurge = (variant.media || [])
    .map((image) => image.publicId)
    .filter(Boolean);

  const deletedVariant = await variantDb.deleteVariant(id, tx);

  return { variant: deletedVariant, publicIdsToPurge };
};

// ============================================================================
// BULK CREATE
// ============================================================================

export const bulkCreateVariants = async (
  productId,
  variantsData,
  tx = null,
) => {
  const product = await productDb.findProductBasicById(productId, tx);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const preparedVariants = await VariantFactory.buildMany(variantsData, {
    productName: product.name,
    categoryId: product.categoryId,
    tx,
  });

  const variantsWithImages = preparedVariants.map((variant, index) => ({
    ...variant,
    productId,
    variantImages: variantsData[index]?.variantImages || [],
  }));

  return variantDb.bulkCreateVariants(variantsWithImages, tx);
};

// ============================================================================
// READ
// ============================================================================

export const getVariantById = async (id, tx = null) => {
  const variant = await variantDb.findVariantById(id, tx);
  if (!variant) {
    throw new NotFoundError("Variant not found");
  }
  return variant;
};

export const getVariantsByProduct = (productId, filters = {}, tx = null) => {
  return variantDb.findVariantsByProduct(productId, filters, tx);
};

// ============================================================================
// STOCK
// ============================================================================

export const updateVariantStock = (id, quantity, tx = null) =>
  variantDb.updateVariantStock(id, quantity, tx);

export const decrementVariantStock = (id, quantity, tx = null) =>
  variantDb.decrementVariantStock(id, quantity, tx);

export const incrementVariantStock = (id, quantity, tx = null) =>
  variantDb.incrementVariantStock(id, quantity, tx);

export const getVariantWithStockCheck = (id, requiredQuantity, tx = null) =>
  variantDb.getVariantWithStockCheck(id, requiredQuantity, tx);

// ============================================================================
// BULK STOCK / DELETE
// ============================================================================

export const bulkUpdateVariantStock = (updates, tx = null) =>
  variantDb.bulkUpdateVariantStock(updates, tx);

export const bulkDeleteVariants = (ids, tx = null) =>
  variantDb.bulkDeleteVariants(ids, tx);

// modules/variants/variant.service.js (additions)

import { prisma } from "../../config/prisma.js";

/**
 * Archive a variant.
 *
 * - Has order/fulfillment history → soft delete + ArchiveRecord
 * - No history → hard delete + ArchiveRecord (snapshot)
 *
 * Returns { variant: null, publicIdsToPurge, archiveRecord }
 */
export const archiveVariant = async (variantId, { reason, archivedBy } = {}, tx = null) => {
  const client = tx ?? prisma;

  const variant = await client.productVariant.findUnique({
    where: { id: variantId },
    include: {
      media: true,
      _count: { select: { orderItems: true, fulfillmentItems: true } },
    },
  });

  if (!variant) throw new NotFoundError("Variant not found");

  const hasHistory =
    variant._count.orderItems > 0 || variant._count.fulfillmentItems > 0;

  const snapshot = {
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    price: variant.price,
    stock: variant.stock,
    media: variant.media.map((m) => ({ url: m.url, publicId: m.publicId })),
    archivedAt: new Date().toISOString(),
  };

  const publicIdsToPurge = [];

  const restoreUntil = new Date();
  restoreUntil.setDate(restoreUntil.getDate() + 90);

  if (hasHistory) {
    // Soft delete — preserve FK integrity.
    await client.productVariant.update({
      where: { id: variantId },
      data: {
        isActive: false,
        sku: `${variant.sku}__archived_${Date.now()}`,
        metadata: {
          ...(variant.metadata ?? {}),
          originalSku: variant.metadata?.originalSku ?? variant.sku,
        },
      },
    });
  } else {
    // Hard delete — no history to preserve.
    for (const media of variant.media) {
      if (media.publicId) publicIdsToPurge.push(media.publicId);
    }

    await client.productVariant.delete({ where: { id: variantId } });
  }

  const archiveRecord = await client.archiveRecord.create({
    data: {
      entityType: "VARIANT",
      entityId: variantId,
      snapshot,
      reason: reason ?? null,
      archivedBy: archivedBy ?? null,
      restoreUntil,
    },
  });

  return {
    variant: null,
    publicIdsToPurge,
    archiveRecord,
    wasSoftDeleted: hasHistory,
  };
};

// ============================================================================
// METRICS
// ============================================================================

export const getVariantMetrics = (tx = null) => variantDb.getVariantMetrics(tx);
