import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as productService from "./product.service.js";
import * as productAggregateService from "./product.aggregate.service.js";

// ============================================================================
// HELPERS
// ============================================================================

const buildProductPayload = (req) => {
  const payload = { ...req.body };

  if (typeof payload.variants === "string") {
    try {
      const parsedVariants = JSON.parse(payload.variants);
      payload.variants = parsedVariants.map((variant, index) => ({
        ...variant,
        variantImages: req.body.variantImages || [],
      }));
    } catch (error) {
        throw new Error("Invalid JSON format for variants");
      payload.variants = [];
    }
  } else if (Array.isArray(payload.variants)) {
    payload.variants = payload.variants.map((variant) => ({
      ...variant,
      variantImages: req.body.variantImages || [],
    }));
  }

  return payload;
};

// ============================================================================
// READ OPERATIONS
// ============================================================================

export const getProducts = asyncWrapper(async (req, res) => {
  const result = await productService.getProducts(req.query);

  return successResponse({
    res,
    message: "Products fetched successfully",
    data: result.products,
    meta: result.meta,
  });
});

export const getProductById = asyncWrapper(async (req, res) => {
  const product = await productService.getProductById(req.params.id);

  return successResponse({
    res,
    message: "Product fetched successfully",
    data: product,
  });
});

export const getProductBySlug = asyncWrapper(async (req, res) => {
  const product = await productService.getProductBySlug(req.params.slug);

  return successResponse({
    res,
    message: "Product fetched successfully",
    data: product,
  });
});

export const getFeaturedProducts = asyncWrapper(async (req, res) => {
  const products = await productService.getFeaturedProducts(req.query);

  return successResponse({
    res,
    message: "Featured products fetched successfully",
    data: products,
  });
});

export const getNewArrivals = asyncWrapper(async (req, res) => {
  const products = await productService.getNewArrivals(req.query);

  return successResponse({
    res,
    message: "New arrivals fetched successfully",
    data: products,
  });
});

export const getBestSellers = asyncWrapper(async (req, res) => {
  const products = await productService.getBestSellers(req.query);

  return successResponse({
    res,
    message: "Best sellers fetched successfully",
    data: products,
  });
});

export const getRelatedProducts = asyncWrapper(async (req, res) => {
  const products = await productService.getRelatedProducts(
    req.params.productId,
    req.query.limit,
  );

  return successResponse({
    res,
    message: "Related products fetched successfully",
    data: products,
  });
});

export const getProductVariants = asyncWrapper(async (req, res) => {
  const variants = await productService.getProductVariants(
    req.params.productId,
  );

  return successResponse({
    res,
    message: "Product variants fetched successfully",
    data: variants,
  });
});

// ============================================================================
// WRITE OPERATIONS
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

export const deleteProduct = asyncWrapper(async (req, res) => {
  await productAggregateService.deleteProductAggregate(req.params.id);

  return successResponse({
    res,
    message: "Product deleted successfully",
    data: null,
  });
});

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
