import { ConflictError, NotFoundError } from "../../classes/errorClasses.js";
import * as variantDb from "./variant.db.js";
import * as productDb from "../products/product.db.js";
import { VariantFactory } from "./variant.factory.js";
import { deleteFromCloudinary } from "../../config/cloudinaryService.js";

// ============================================================================
// PREPARATION
// ============================================================================

/**
 * Prepare a single variant for creation.
 *
 * No database write occurs here.
 */
export const prepareVariant = async (payload, context = {}) => {
  return VariantFactory.buildForCreate(payload, context);
};

/**
 * Prepare multiple variants for creation.
 *
 * No database write occurs here.
 */
export const prepareVariants = async (variants = [], context = {}) => {
  return VariantFactory.buildMany(variants, context);
};

/**
 * Prepare an existing variant for update.
 *
 * No database write occurs here.
 */
export const updatePreparedVariant = async (
  existingVariant,
  payload,
  context = {},
) => {
  return VariantFactory.buildForUpdate(existingVariant, payload, context);
};

// ============================================================================
// CREATE
// ============================================================================

/**
 * Create a variant, optionally with media.
 *
 * `variantImages` is a transport-level field and is never
 * persisted directly on ProductVariant.
 */
export const createVariant = async (data, tx = null) => {
  const db = tx ?? undefined;

  const {
    productId,
    variantImages = [],
    imageIndexes,
    ...variantPayload
  } = data;

  const product = await productDb.findProductById(productId, db);

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const existingSku = await variantDb.findVariantBySKU(variantPayload.sku, db);

  if (existingSku) {
    throw new ConflictError(
      `Variant SKU already exists: ${variantPayload.sku}`,
    );
  }

  const preparedVariant = await VariantFactory.buildForCreate(variantPayload, {
    productName: product.name,
    categoryId: product.categoryId,
  });

  return variantDb.createVariantWithMedia(
    {
      ...preparedVariant,
      productId,
    },
    variantImages,
    db,
  );
};

// ============================================================================
// UPDATE
// ============================================================================

/**
 * Update an existing variant.
 *
 * Scalar fields are updated via VariantFactory.buildForUpdate(). Media is
 * replaced separately via updateVariantImages() — and only when the caller
 * actually supplied new images. An empty/absent `variantImages` means "no
 * image change" here, not "clear the images"; otherwise editing an
 * unrelated field (price, stock) on a variant with no new upload would
 * wipe its existing photos. An explicit "remove all images" action should
 * be its own payload flag, not an empty array.
 */
export const updateVariant = async (id, payload, tx = null) => {
  const variant = await variantDb.findVariantById(id, tx);

  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  const { variantImages, imageIndexes, ...updateData } = payload;

  // --------------------------------------------------------------------------
  // Validate SKU uniqueness
  // --------------------------------------------------------------------------

  if (updateData.sku && updateData.sku !== variant.sku) {
    const existingVariant = await variantDb.findVariantBySKU(
      updateData.sku,
      tx,
    );

    if (existingVariant && existingVariant.id !== id) {
      throw new ConflictError("SKU already exists");
    }
  }

  // --------------------------------------------------------------------------
  // Prepare and persist scalar fields
  // --------------------------------------------------------------------------

  const preparedVariant = await VariantFactory.buildForUpdate(
    variant,
    updateData,
    {
      productName: variant.product.name,
      categoryId: variant.product.categoryId,
    },
  );

  const updatedVariant = await variantDb.updateVariant(id, preparedVariant, tx);

  // --------------------------------------------------------------------------
  // Replace media only when new images were actually provided
  // --------------------------------------------------------------------------

  if (Array.isArray(variantImages) && variantImages.length > 0) {
    return updateVariantImages(id, variantImages, tx);
  }

  return updatedVariant;
};

// ============================================================================
// MEDIA
// ============================================================================

/**
 * Replace all images belonging to a variant.
 *
 * Database media records are replaced and the old Cloudinary
 * assets are removed afterward.
 */
export const updateVariantImages = async (id, images = [], tx = null) => {
  const variant = await variantDb.findVariantById(id, tx);

  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  const oldImages = variant.media || [];

  const oldPublicIds = oldImages.map((image) => image.publicId).filter(Boolean);

  const updatedVariant = await variantDb.updateVariantMedia(id, images, tx);

  if (oldPublicIds.length > 0) {
    await deleteFromCloudinary(oldPublicIds);
  }

  return updatedVariant;
};

// ============================================================================
// DELETE
// ============================================================================

/**
 * Delete a variant and its associated Cloudinary images.
 */
export const deleteVariant = async (id, tx = null) => {
  const variant = await variantDb.findVariantById(id, tx);

  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  const images = variant.media || [];

  const publicIds = images.map((image) => image.publicId).filter(Boolean);

  const deletedVariant = await variantDb.deleteVariant(id, tx);

  if (publicIds.length > 0) {
    await deleteFromCloudinary(publicIds);
  }

  return deletedVariant;
};

// ============================================================================
// BULK CREATE
// ============================================================================

/**
 * Create multiple variants for an existing product.
 */
export const bulkCreateVariants = async (
  productId,
  variantsData,
  tx = null,
) => {
  const db = tx ?? undefined;

  const product = await productDb.findProductById(productId, db);

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const preparedVariants = await VariantFactory.buildMany(variantsData, {
    productName: product.name,
    categoryId: product.categoryId,
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

export const updateVariantStock = (id, quantity, tx = null) => {
  return variantDb.updateVariantStock(id, quantity, tx);
};

export const decrementVariantStock = (id, quantity, tx = null) => {
  return variantDb.decrementVariantStock(id, quantity, tx);
};

export const incrementVariantStock = (id, quantity, tx = null) => {
  return variantDb.incrementVariantStock(id, quantity, tx);
};

export const getVariantWithStockCheck = (id, requiredQuantity, tx = null) => {
  return variantDb.getVariantWithStockCheck(id, requiredQuantity, tx);
};

// ============================================================================
// BULK STOCK / DELETE
// ============================================================================

export const bulkUpdateVariantStock = (updates, tx = null) => {
  return variantDb.bulkUpdateVariantStock(updates, tx);
};

export const bulkDeleteVariants = (ids, tx = null) => {
  return variantDb.bulkDeleteVariants(ids, tx);
};

// ============================================================================
// METRICS
// ============================================================================

export const getVariantMetrics = (tx = null) => {
  return variantDb.getVariantMetrics(tx);
};
