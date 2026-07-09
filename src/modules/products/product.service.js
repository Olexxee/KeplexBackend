// modules/products/product.service.js
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../classes/errorClasses.js";
import {
  getPaginationParams,
  buildPaginationMeta,
} from "../../lib/pagination.js";
import * as productDb from "./product.db.js";
import * as categoryDb from "../categories/category.db.js";
import * as brandDb from "../brands/brand.db.js";
import * as collectionDb from "../collections/collection.db.js";
import { SKUGenerator } from "../variants/sku.generator.js";
import { CBMCalculator } from "../shipping/cbm.calculator.js";

const normalizeProductPayload = (payload) => ({
  ...payload,
  description: payload.description || null,
  brandId: payload.brandId || null,
  collectionId: payload.collectionId || null,
  metadata: payload.metadata || null,
});

export const createProduct = async (payload) => {
  const data = normalizeProductPayload(payload);

  // Validate category
  if (data.categoryId) {
    const category = await categoryDb.findCategoryById(data.categoryId);
    if (!category) {
      throw new BadRequestError("Category does not exist");
    }
    if (!category.isActive) {
      throw new BadRequestError("Cannot assign product to inactive category");
    }
  }

  // Validate brand
  if (data.brandId) {
    const brand = await brandDb.findBrandById(data.brandId);
    if (!brand) {
      throw new BadRequestError("Brand does not exist");
    }
    if (!brand.isActive) {
      throw new BadRequestError("Cannot assign product to inactive brand");
    }
  }

  // Validate collection
  if (data.collectionId) {
    const collection = await collectionDb.findCollectionById(data.collectionId);
    if (!collection) {
      throw new BadRequestError("Collection does not exist");
    }
    if (!collection.isActive) {
      throw new BadRequestError("Cannot assign product to inactive collection");
    }
  }

  // Check slug uniqueness
  const existingSlug = await productDb.findProductBySlug(data.slug);
  if (existingSlug) {
    throw new ConflictError("Product slug already exists");
  }

  // Process variants if provided
  if (data.variants && data.variants.length > 0) {
    for (const variant of data.variants) {
      // Generate SKU if not provided
      if (!variant.sku) {
        variant.sku = await SKUGenerator.generateSKU({
          productName: data.name,
          categoryId: data.categoryId,
          color: variant.color,
          size: variant.size,
        });
      }

      // Calculate CBM if dimensions provided
      if (variant.length && variant.width && variant.height) {
        variant.cbm = CBMCalculator.calculateCBM({
          length: variant.length,
          width: variant.width,
          height: variant.height,
        });

        if (variant.actualWeight) {
          variant.volumetricWeight = CBMCalculator.calculateVolumetricWeight(
            variant.cbm,
            variant.shippingType || "SEA",
          );
          variant.chargeableWeight = CBMCalculator.calculateChargeableWeight(
            variant.actualWeight,
            variant.cbm,
            variant.shippingType || "SEA",
          );
        }
      }
    }
  }

  const product = await productDb.createProduct(data);

  return product;
};

export const getProducts = async (filters) => {
  const {
    page = 1,
    limit = 20,
    categoryId,
    brandId,
    collectionId,
    status,
    isFeatured,
    isNew,
    isBestSeller,
    minPrice,
    maxPrice,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const { skip, take } = getPaginationParams(page, limit);

  const { products, total } = await productDb.findProducts({
    categoryId,
    brandId,
    collectionId,
    status,
    isFeatured,
    isNew,
    isBestSeller,
    minPrice,
    maxPrice,
    search,
    sortBy,
    sortOrder,
    skip,
    take,
    includeVariants: true,
  });

  return {
    products,
    meta: buildPaginationMeta({
      page,
      limit,
      total,
    }),
  };
};

export const getProductById = async (id) => {
  const product = await productDb.findProductById(id);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  // Calculate average rating
  const allRatings =
    product.variants?.flatMap((v) => v.reviews?.map((r) => r.rating) || []) ||
    [];

  const avgRating =
    allRatings.length > 0
      ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
      : 0;

  const lowestPrice =
    product.variants?.length > 0
      ? Math.min(...product.variants.map((v) => Number(v.price)))
      : null;

  const highestPrice =
    product.variants?.length > 0
      ? Math.max(...product.variants.map((v) => Number(v.price)))
      : null;

  return {
    ...product,
    avgRating: parseFloat(avgRating.toFixed(1)),
    priceRange: {
      min: lowestPrice,
      max: highestPrice,
    },
    totalReviews: allRatings.length,
  };
};

export const getProductBySlug = async (slug) => {
  const product = await productDb.findProductBySlug(slug);
  if (!product) {
    throw new NotFoundError("Product not found");
  }
  return product;
};

export const updateProduct = async (id, payload) => {
  const product = await productDb.findProductById(id);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const data = normalizeProductPayload(payload);

  // Validate category if provided
  if (data.categoryId) {
    const category = await categoryDb.findCategoryById(data.categoryId);
    if (!category) {
      throw new BadRequestError("Category does not exist");
    }
    if (!category.isActive) {
      throw new BadRequestError("Cannot assign product to inactive category");
    }
  }

  // Validate brand if provided
  if (data.brandId) {
    const brand = await brandDb.findBrandById(data.brandId);
    if (!brand) {
      throw new BadRequestError("Brand does not exist");
    }
    if (!brand.isActive) {
      throw new BadRequestError("Cannot assign product to inactive brand");
    }
  }

  // Validate collection if provided
  if (data.collectionId) {
    const collection = await collectionDb.findCollectionById(data.collectionId);
    if (!collection) {
      throw new BadRequestError("Collection does not exist");
    }
    if (!collection.isActive) {
      throw new BadRequestError("Cannot assign product to inactive collection");
    }
  }

  // Check slug uniqueness if changed
  if (data.slug && data.slug !== product.slug) {
    const existingSlug = await productDb.findProductBySlug(data.slug);
    if (existingSlug && existingSlug.id !== id) {
      throw new ConflictError("Product slug already exists");
    }
  }

  return productDb.updateProduct(id, data);
};

export const deleteProduct = async (id) => {
  const product = await productDb.findProductById(id);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return productDb.deleteProduct(id);
};

export const updateProductStatus = async (id, status) => {
  const product = await productDb.findProductById(id);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return productDb.updateProductStatus(id, status);
};

export const getFeaturedProducts = async (filters) => {
  return productDb.findFeaturedProducts(filters);
};

export const getNewArrivals = async (filters) => {
  return productDb.findNewArrivals(filters);
};

export const getBestSellers = async (filters) => {
  return productDb.findBestSellers(filters);
};

export const getRelatedProducts = async (productId, limit) => {
  const product = await productDb.findProductById(productId);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return productDb.getRelatedProducts(productId, limit);
};

export const getProductVariants = async (productId) => {
  const product = await productDb.findProductById(productId);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return productDb.getProductVariants(productId);
};
