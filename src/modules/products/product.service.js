import { NotFoundError } from "../../classes/errorClasses.js";
import {
  getPaginationParams,
  buildPaginationMeta,
} from "../../lib/pagination.js";
import { productEngine } from "./product.engine.service.js";
import * as productDb from "./product.db.js";
import * as productAggregateService from "./product.aggregate.service.js";

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

export const getProductById = async (
  id,
  { includeInactiveVariants = false } = {},
) => {
  const product = includeInactiveVariants
    ? await productDb.findProductByIdForAdmin(id)
    : await productDb.findProductById(id);

  if (!product) throw new NotFoundError("Product not found");
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
// The controller's single entry point for catalog / homepage / product-detail
// reads. This is the service's boundary in front of product.engine.service.js
// — the controller should never import the engine directly.

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
// ADMIN — READ (all variants, active + inactive)
// ============================================================================

export const getProductByIdForAdmin = async (id) => {
  const product = await productDb.findProductByIdForAdmin(id);
  if (!product) throw new NotFoundError("Product not found");
  return product;
};

// ============================================================================
// VARIANTS — SINGLE
// ============================================================================

export const createVariant = (payload) => {
  return variantService.createVariant(payload);
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

// ============================================================================
// ADMIN — WRITE
// ============================================================================
// This is the ONLY module that imports product.aggregate.service.js.
// The controller talks to product.service.js exclusively; it never reaches
// into the aggregate service (or the engine, above) directly. Keeping these
// as thin passthroughs — rather than re-exporting the aggregate module —
// means the service can grow cross-cutting concerns (logging, caching,
// authorization checks that don't belong in the aggregate) later without
// touching the controller.

export const createProduct = (payload) => {
  return productAggregateService.createProductAggregate(payload);
};

export const updateProduct = (id, payload) => {
  return productAggregateService.updateProductAggregate(id, payload);
};

export const updateProductStatus = (id, status) => {
  return productAggregateService.updateProductStatusAggregate(id, status);
};

export const archiveProduct = (id, options) => {
  return productAggregateService.archiveProductAggregate(id, options);
};

export const deleteProduct = (id) => {
  return productAggregateService.deleteProductAggregate(id);
};
