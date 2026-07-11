// modules/variants/variant.service.js
import { ConflictError, NotFoundError } from "../../classes/errorClasses.js";
import * as variantDb from "./variant.db.js";
import * as productDb from "../products/product.db.js";
import { VariantFactory } from "./variant.factory.js";
import { deleteFromCloudinary } from "../../config/cloudinaryService.js";

// ============================================================================
// PREPARATION METHODS
// ============================================================================

export const prepareVariant = async (payload, context = {}) => {
  return VariantFactory.buildForCreate(payload, context);
};

export const prepareVariants = async (variants = [], context = {}) => {
  return VariantFactory.buildMany(variants, context);
};

export const updatePreparedVariant = async (
  existingVariant,
  payload,
  context = {},
) => {
  return VariantFactory.buildForUpdate(existingVariant, payload, context);
};

// ============================================================================
// PERSISTENCE METHODS
// ============================================================================

export const createVariant = async (payload, tx = null) => {
  const { productId, variantImages = [], ...variantData } = payload;

  const product = await productDb.findProductById(productId);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  if (variantData.sku) {
    const existing = await variantDb.findVariantBySKU(variantData.sku);
    if (existing) {
      throw new ConflictError("SKU already exists");
    }
  }

  const preparedVariant = await VariantFactory.buildForCreate(variantData, {
    productName: product.name,
    categoryId: product.categoryId,
  });

  // Create variant with images
  return variantDb.createVariantWithMedia(
    {
      ...preparedVariant,
      productId,
    },
    variantImages,
    tx,
  );
};

export const updateVariant = async (id, payload, tx = null) => {
  const variant = await variantDb.findVariantById(id);
  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  const { variantImages, ...updateData } = payload;

  if (updateData.sku && updateData.sku !== variant.sku) {
    const existing = await variantDb.findVariantBySKU(updateData.sku);
    if (existing && existing.id !== id) {
      throw new ConflictError("SKU already exists");
    }
  }

  const preparedVariant = await VariantFactory.buildForUpdate(
    variant,
    updateData,
    {
      productName: variant.product.name,
      categoryId: variant.product.categoryId,
    },
  );

  return variantDb.updateVariant(id, preparedVariant, tx);
};

export const updateVariantImages = async (id, images, tx = null) => {
  const variant = await variantDb.findVariantById(id);
  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  // Get old images to delete from Cloudinary
  const oldImages = variant.media || [];
  const oldPublicIds = oldImages.map((img) => img.publicId);

  // Update variant media
  const updatedVariant = await variantDb.updateVariantMedia(id, images, tx);

  // Delete old images from Cloudinary
  if (oldPublicIds.length > 0) {
    await deleteFromCloudinary(oldPublicIds);
  }

  return updatedVariant;
};

export const deleteVariant = async (id, tx = null) => {
  const variant = await variantDb.findVariantById(id);
  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  // Get image publicIds before deletion
  const images = variant.media || [];
  const publicIds = images.map((img) => img.publicId);

  // Delete variant from database
  const deletedVariant = await variantDb.deleteVariant(id, tx);

  // Delete images from Cloudinary
  if (publicIds.length > 0) {
    await deleteFromCloudinary(publicIds);
  }

  return deletedVariant;
};

export const bulkCreateVariants = async (
  productId,
  variantsData,
  tx = null,
) => {
  const product = await productDb.findProductById(productId);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const preparedVariants = await VariantFactory.buildMany(variantsData, {
    productName: product.name,
    categoryId: product.categoryId,
  });

  return variantDb.bulkCreateVariants(
    preparedVariants.map((variant, index) => ({
      ...variant,
      productId,
      // If variantImages are provided in the data
      variantImages: variantsData[index]?.variantImages || [],
    })),
    tx,
  );
};

// ============================================================================
// READ METHODS (delegated to DB)
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
