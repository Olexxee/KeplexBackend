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

const normalizeProductPayload = (payload = {}) => ({
  ...payload,
  description: payload.description ?? null,
  brandId: payload.brandId ?? null,
  collectionId: payload.collectionId ?? null,
  metadata: payload.metadata ?? null,
});

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
    if (!category.isActive)
      throw new BadRequestError("Cannot assign product to inactive category");
  }
  if (data.brandId) {
    const brand = await brandDb.findBrandById(data.brandId);
    if (!brand) throw new BadRequestError("Brand does not exist");
    if (!brand.isActive)
      throw new BadRequestError("Cannot assign product to inactive brand");
  }
  if (data.collectionId) {
    const collection = await collectionDb.findCollectionById(data.collectionId);
    if (!collection) throw new BadRequestError("Collection does not exist");
    if (!collection.isActive)
      throw new BadRequestError("Cannot assign product to inactive collection");
  }
};

const prepareVariants = async (productData) => {
  if (!productData.variants?.length) return [];
  const variantsForPreparation = productData.variants.map(
    ({ imageIndexes, ...v }) => v,
  );
  return variantService.prepareVariants(variantsForPreparation, {
    productName: productData.name,
    categoryId: productData.categoryId,
  });
};

// ============================================================================
// VARIANT SYNC HELPERS
// ============================================================================

const classifyVariants = (existingVariants = [], incomingVariants = []) => {
  const existingMap = new Map(existingVariants.map((v) => [v.id, v]));
  const creates = [];
  const updates = [];
  for (const incoming of incomingVariants) {
    if (incoming.id && existingMap.has(incoming.id)) {
      updates.push({ existing: existingMap.get(incoming.id), incoming });
      existingMap.delete(incoming.id);
    } else {
      creates.push(incoming);
    }
  }
  return { creates, updates, deletes: [...existingMap.values()] };
};

const synchronizeVariants = async (product, incomingVariants, tx) => {
  const { creates, updates, deletes } = classifyVariants(
    product.variants || [],
    incomingVariants || [],
  );

  for (const variant of deletes) {
    await variantService.deleteVariant(variant.id, tx);
  }
  for (const { existing, incoming } of updates) {
    await variantService.updateVariant(existing.id, incoming, tx);
  }
  for (const variant of creates) {
    await variantService.createVariant(
      { ...variant, productId: product.id },
      tx,
    );
  }
};

// ============================================================================
// PUBLIC AGGREGATE OPERATIONS
// ============================================================================

export const createProductAggregate = async (payload) => {
  const data = normalizeProductPayload(payload);
  await validateRelations(data);

  const existing = await productDb.findProductBySlug(data.slug);
  if (existing) throw new ConflictError("Product slug already exists");

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
          isPrimary: true, // you can adjust based on order if needed
        }),
      ),
    },
  }));

  // Atomic nested create – no explicit transaction needed
  const product = await prisma.product.create({
    data: {
      ...productData,
      variants: { create: variantData },
    },
    include: productDb.productDetailInclude, // exported from product.db
  });

  return product;
};

export const updateProductAggregate = async (id, payload) => {
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

  return prisma.$transaction(async (tx) => {
    await productDb.updateProduct(id, productData, tx);

    if (Array.isArray(incomingVariants)) {
      const updatedProduct = await productDb.findProductById(id, tx);
      const preparedVariants = await prepareVariants({
        name: product.name,
        categoryId: product.categoryId,
        variants: incomingVariants,
      });

      const variantsWithImages = incomingVariants.map((variant, index) => ({
        ...preparedVariants[index],
        variantImages: getVariantImages(variant, variantImages),
      }));

      await synchronizeVariants(updatedProduct, variantsWithImages, tx);
    }

    return productDb.findProductById(id, tx);
  });
};

export const deleteProductAggregate = async (id) => {
  const product = await productDb.findProductById(id);
  if (!product) throw new NotFoundError("Product not found");

  const mediaToDelete = product.variants.flatMap(
    (variant) => variant.media?.map((m) => m.publicId) ?? [],
  );

  const deletedProduct = await prisma.$transaction(async (tx) =>
    productDb.deleteProduct(id, tx),
  );

  if (mediaToDelete.length > 0) {
    await deleteFromCloudinary(mediaToDelete);
  }

  return deletedProduct;
};

export const updateProductStatusAggregate = async (id, status) => {
  const product = await productDb.findProductById(id);
  if (!product) throw new NotFoundError("Product not found");

  return prisma.$transaction(async (tx) => {
    await productDb.updateProductStatus(id, status, tx);
    return productDb.findProductById(id, tx);
  });
};
