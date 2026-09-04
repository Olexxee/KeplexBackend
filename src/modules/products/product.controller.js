import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";

import * as productService from "./product.service.js";
import { productEngine } from "./product.engine.service.js";
import * as productAggregateService from "./product.aggregate.service.js";

// ============================================================================
// HELPERS
// ============================================================================

const buildProductPayload = (req) => {
  const payload = {
    ...req.body,
  };

  if (typeof payload.variants === "string") {
    try {
      payload.variants = JSON.parse(payload.variants);
    } catch {
      throw new Error("Invalid JSON format for variants");
    }
  }

  if (!Array.isArray(payload.variants)) {
    payload.variants = [];
  }

  return payload;
};

// ============================================================================
// PUBLIC — PRODUCT LIST
// ============================================================================

export const getProducts = asyncWrapper(async (req, res) => {
  const { context = "catalog", slug, id, ...filters } = req.query;

  const options = {
    featuredLimit: Number(req.query.featuredLimit) || 6,

    newLimit: Number(req.query.newLimit) || 4,

    bestSellerLimit: Number(req.query.bestSellerLimit) || 4,

    relatedLimit: Number(req.query.relatedLimit) || 4,
  };

  const resolvedContext = slug || id ? "product-detail" : context;

  const result = await productEngine.getProducts({
    context: resolvedContext,

    filters: {
      ...filters,
      slug,
      id,
    },

    options,
  });

  return successResponse({
    res,

    message: "Products fetched successfully",

    data: result.data,

    meta: result.meta,

    context: result.context,
  });
});

// ============================================================================
// PUBLIC — PRODUCT BY ID
// ============================================================================

export const getProductById = asyncWrapper(async (req, res) => {
  const product = await productService.getProductById(req.params.id);

  return successResponse({
    res,

    message: "Product fetched successfully",

    data: product,
  });
});

// ============================================================================
// PUBLIC — PRODUCT BY SLUG
// ============================================================================

export const getProductBySlug = asyncWrapper(async (req, res) => {
  const product = await productService.getProductBySlug(req.params.slug);

  return successResponse({
    res,

    message: "Product fetched successfully",

    data: product,
  });
});

// ============================================================================
// PUBLIC — FEATURED
// ============================================================================

export const getFeaturedProducts = asyncWrapper(async (req, res) => {
  const products = await productService.getFeaturedProducts(
    req.validated?.query ?? req.query,
  );

  return successResponse({
    res,

    message: "Featured products fetched successfully",

    data: products,
  });
});

// ============================================================================
// PUBLIC — NEW ARRIVALS
// ============================================================================

export const getNewArrivals = asyncWrapper(async (req, res) => {
  const products = await productService.getNewArrivals(
    req.validated?.query ?? req.query,
  );

  return successResponse({
    res,

    message: "New arrivals fetched successfully",

    data: products,
  });
});

// ============================================================================
// PUBLIC — BEST SELLERS
// ============================================================================

export const getBestSellers = asyncWrapper(async (req, res) => {
  const products = await productService.getBestSellers(
    req.validated?.query ?? req.query,
  );

  return successResponse({
    res,

    message: "Best sellers fetched successfully",

    data: products,
  });
});

// ============================================================================
// PUBLIC — RELATED PRODUCTS
// ============================================================================

export const getRelatedProducts = asyncWrapper(async (req, res) => {
  const query = req.validated?.query ?? req.query;

  const products = await productService.getRelatedProducts(
    req.params.id,
    query.limit,
  );

  return successResponse({
    res,

    message: "Related products fetched successfully",

    data: products,
  });
});

// ============================================================================
// PUBLIC — PRODUCT VARIANTS
// ============================================================================

export const getProductVariants = asyncWrapper(async (req, res) => {
  const variants = await productService.getProductVariants(req.params.id);

  return successResponse({
    res,

    message: "Product variants fetched successfully",

    data: variants,
  });
});

// ============================================================================
// ADMIN — CREATE PRODUCT
// ============================================================================

export const createProduct = asyncWrapper(async (req, res) => {
  const payload = buildProductPayload(req);

  const product = await productAggregateService.createProductAggregate(payload);

  return successResponse({
    res,

    statusCode: 201,

    message: "Product created successfully",

    data: product,
  });
});

// ============================================================================
// ADMIN — UPDATE PRODUCT
// ============================================================================

export const updateProduct = asyncWrapper(async (req, res) => {
  const payload = buildProductPayload(req);

  const product = await productAggregateService.updateProductAggregate(
    req.params.id,
    payload,
  );

  return successResponse({
    res,

    message: "Product updated successfully",

    data: product,
  });
});

// ============================================================================
// ADMIN — UPDATE PRODUCT STATUS
// ============================================================================

export const updateProductStatus = asyncWrapper(async (req, res) => {
  const { status } = req.body;

  const product = await productAggregateService.updateProductStatusAggregate(
    req.params.id,
    status,
  );

  return successResponse({
    res,

    message: "Product status updated successfully",

    data: product,
  });
});

// ============================================================================
// ADMIN — DELETE PRODUCT
// ============================================================================

export const deleteProduct = asyncWrapper(async (req, res) => {
  const product = await productAggregateService.deleteProductAggregate(
    req.params.id,
  );

  return successResponse({
    res,

    message: "Product deleted successfully",

    data: product,
  });
});
