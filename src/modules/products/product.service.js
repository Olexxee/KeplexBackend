import { NotFoundError } from "../../classes/errorClasses.js";
import {
  getPaginationParams,
  buildPaginationMeta,
} from "../../lib/pagination.js";
import { productEngine } from "./product.engine.service.js";
import * as productDb from "./product.db.js";

// ============================================================================
// LIST
// ============================================================================

export const getProducts = async (filters = {}) => {
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

// ============================================================================
// BY ID
// ============================================================================

export const getProductById = async (id) => {
  const product = await productDb.findProductById(id);

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return product;
};

// ============================================================================
// BY SLUG
// ============================================================================

export const getProductBySlug = async (slug) => {
  const product = await productDb.findProductBySlug(slug);

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return product;
};

// ============================================================================
// CONTEXT
// ============================================================================

export const getProductsByContext = async ({ context, filters, options }) => {
  return productEngine.getProducts({
    context,
    filters,
    options,
  });
};

// ============================================================================
// FEATURED
// ============================================================================

export const getFeaturedProducts = async (filters = {}) => {
  return productDb.findFeaturedProducts(filters);
};

// ============================================================================
// NEW ARRIVALS
// ============================================================================

export const getNewArrivals = async (filters = {}) => {
  return productDb.findNewArrivals(filters);
};

// ============================================================================
// BEST SELLERS
// ============================================================================

export const getBestSellers = async (filters = {}) => {
  return productDb.findBestSellers(filters);
};

// ============================================================================
// RELATED
// ============================================================================

export const getRelatedProducts = async (productId, limit = 6) => {
  const product = await productDb.findProductById(productId);

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return productDb.getRelatedProducts(productId, limit);
};

// ============================================================================
// VARIANTS
// ============================================================================

export const getProductVariants = async (productId) => {
  const product = await productDb.findProductById(productId);

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return productDb.getProductVariants(productId);
};
