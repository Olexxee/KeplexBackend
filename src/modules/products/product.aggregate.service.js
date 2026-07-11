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
// PRIVATE HELPERS
// ============================================================================

/**
 * Normalize product payload by setting null defaults
 */
const normalizeProductPayload = (payload = {}) => ({
  ...payload,
  description: payload.description ?? null,
  brandId: payload.brandId ?? null,
  collectionId: payload.collectionId ?? null,
  metadata: payload.metadata ?? null,
});

/**
 * Validate that Category, Brand, and Collection exist and are active
 */
const validateRelations = async (data) => {
  if (data.categoryId) {
    const category = await categoryDb.findCategoryById(data.categoryId);
    if (!category) {
      throw new BadRequestError("Category does not exist");
    }
    if (!category.isActive) {
      throw new BadRequestError("Cannot assign product to inactive category");
    }
  }

  if (data.brandId) {
    const brand = await brandDb.findBrandById(data.brandId);
    if (!brand) {
      throw new BadRequestError("Brand does not exist");
    }
    if (!brand.isActive) {
      throw new BadRequestError("Cannot assign product to inactive brand");
    }
  }

  if (data.collectionId) {
    const collection = await collectionDb.findCollectionById(data.collectionId);
    if (!collection) {
      throw new BadRequestError("Collection does not exist");
    }
    if (!collection.isActive) {
      throw new BadRequestError("Cannot assign product to inactive collection");
    }
  }
};

/**
 * Prepare variants using VariantService (SKU generation, CBM, etc.)
 */
const prepareVariants = async (productData) => {
  if (!productData.variants?.length) {
    return [];
  }
  return variantService.prepareVariants(productData.variants, {
    productName: productData.name,
    categoryId: productData.categoryId,
  });
};

/**
 * Classify incoming variants into creates, updates, and deletes
 * Pure function - no database access
 */
const classifyVariants = (existingVariants = [], incomingVariants = []) => {
  const existingMap = new Map(
    existingVariants.map((variant) => [variant.id, variant]),
  );

  const creates = [];
  const updates = [];

  for (const incoming of incomingVariants) {
    if (incoming.id && existingMap.has(incoming.id)) {
      updates.push({
        existing: existingMap.get(incoming.id),
        incoming,
      });
      existingMap.delete(incoming.id);
    } else {
      creates.push(incoming);
    }
  }

  const deletes = [...existingMap.values()];

  return { creates, updates, deletes };
};

/**
 * Synchronize variants - creates, updates, deletes
 */
const synchronizeVariants = async (product, incomingVariants, tx) => {
  const { creates, updates, deletes } = classifyVariants(
    product.variants || [],
    incomingVariants || [],
  );

  // Delete variants (cascade will delete their images)
  for (const variant of deletes) {
    await variantService.deleteVariant(variant.id, tx);
  }

  // Update existing variants
  for (const { existing, incoming } of updates) {
    await variantService.updateVariant(existing.id, incoming, tx);
  }

  // Create new variants
  for (const variant of creates) {
    await variantService.createVariant(
      {
        ...variant,
        productId: product.id,
      },
      tx,
    );
  }
};

// ============================================================================
// PUBLIC METHODS
// ============================================================================

/**
 * Create a product with its variants
 */
export const createProductAggregate = async (payload) => {
  const data = normalizeProductPayload(payload);

  await validateRelations(data);

  const existing = await productDb.findProductBySlug(data.slug);
  if (existing) {
    throw new ConflictError("Product slug already exists");
  }

  const preparedVariants = await prepareVariants(data);
  const { variants, ...productData } = data;

  return prisma.$transaction(async (tx) => {
    const product = await productDb.createProduct(productData, tx);

    await Promise.all(
      preparedVariants.map((variant, index) => {
        const variantImages = data.variants?.[index]?.variantImages || [];
        return variantService.createVariant(
          {
            ...variant,
            productId: product.id,
            variantImages,
          },
          tx,
        );
      }),
    );

    return productDb.findProductById(product.id, tx);
  });
};

/**
 * Update a product and its variants
 */
export const updateProductAggregate = async (id, payload) => {
  const product = await productDb.findProductById(id);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const data = normalizeProductPayload(payload);

  await validateRelations(data);

  if (data.slug && data.slug !== product.slug) {
    const existing = await productDb.findProductBySlug(data.slug);
    if (existing && existing.id !== id) {
      throw new ConflictError("Product slug already exists");
    }
  }

  const { variants: incomingVariants, ...productData } = data;

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
        variantImages: variant.variantImages || [],
      }));

      await synchronizeVariants(updatedProduct, variantsWithImages, tx);
    }

    return productDb.findProductById(id, tx);
  });
};

/**
 * Delete a product and clean up its images from Cloudinary
 */
export const deleteProductAggregate = async (id) => {
  const product = await productDb.findProductById(id);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return prisma.$transaction(async (tx) => {
    const mediaToDelete = [];

    for (const variant of product.variants) {
      if (variant.media && variant.media.length > 0) {
        mediaToDelete.push(...variant.media.map((m) => m.publicId));
      }
    }

    const deletedProduct = await productDb.deleteProduct(id, tx);

    if (mediaToDelete.length > 0) {
      await deleteFromCloudinary(mediaToDelete);
    }

    return deletedProduct;
  });
};

/**
 * Update product status only
 */
export const updateProductStatusAggregate = async (id, status) => {
  const product = await productDb.findProductById(id);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return prisma.$transaction(async (tx) => {
    await productDb.updateProductStatus(id, status, tx);
    return productDb.findProductById(id, tx);
  });
};
