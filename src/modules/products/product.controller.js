import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as productService from "./product.service.js";
import {
  toStorefrontCard,
  toStorefrontCards,
  toStorefrontDetail,
  toAdminList,
  toAdminDetail,
} from "./product.mapper.js";

// ============================================================================
// HELPERS
// ============================================================================

const buildProductPayload = (req) => {
  const payload = { ...req.body };

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
// PUBLIC — LIST
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

  const result = await productService.getProductsByContext({
    context: resolvedContext,
    filters: { ...filters, slug, id },
    options,
  });

  let data = result.data;

  if (resolvedContext === "catalog") {
    const { products } = data;
    // The db layer returns `{ products, total }` but the engine only
    // forwards `products` on the catalog path — handle both shapes.
    const list = Array.isArray(products) ? products : [];
    data = { products: toStorefrontCards(list) };
  } else if (resolvedContext === "homepage") {
    data = {
      featured: toStorefrontCards(result.data.featured ?? []),
      newArrivals: toStorefrontCards(result.data.newArrivals ?? []),
      bestSellers: toStorefrontCards(result.data.bestSellers ?? []),
    };
  } else if (resolvedContext === "product-detail") {
    data = {
      product: toStorefrontDetail(
        result.data.product,
        result.data.related ?? [],
      ),
    };
  }

  return successResponse({
    res,
    message: "Products fetched successfully",
    data,
    meta: result.meta,
    context: result.context,
  });
});

// ============================================================================
// PUBLIC — BY ID
// ============================================================================

export const getProductById = asyncWrapper(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  const related = await productService.getRelatedProducts(product.id, 4);

  return successResponse({
    res,
    message: "Product fetched successfully",
    data: toStorefrontDetail(product, related),
  });
});

// ============================================================================
// PUBLIC — BY SLUG
// ============================================================================

export const getProductBySlug = asyncWrapper(async (req, res) => {
  const product = await productService.getProductBySlug(req.params.slug);
  const related = await productService.getRelatedProducts(product.id, 4);

  return successResponse({
    res,
    message: "Product fetched successfully",
    data: toStorefrontDetail(product, related),
  });
});

// ============================================================================
// PUBLIC — FEATURED / NEW / BEST
// ============================================================================

export const getFeaturedProducts = asyncWrapper(async (req, res) => {
  const products = await productService.getFeaturedProducts(
    req.validated?.query ?? req.query,
  );

  return successResponse({
    res,
    message: "Featured products fetched successfully",
    data: toStorefrontCards(products),
  });
});

export const getNewArrivals = asyncWrapper(async (req, res) => {
  const products = await productService.getNewArrivals(
    req.validated?.query ?? req.query,
  );

  return successResponse({
    res,
    message: "New arrivals fetched successfully",
    data: toStorefrontCards(products),
  });
});

export const getBestSellers = asyncWrapper(async (req, res) => {
  const products = await productService.getBestSellers(
    req.validated?.query ?? req.query,
  );

  return successResponse({
    res,
    message: "Best sellers fetched successfully",
    data: toStorefrontCards(products),
  });
});

// ============================================================================
// PUBLIC — RELATED
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
    data: toStorefrontCards(products),
  });
});

// ============================================================================
// PUBLIC — VARIANTS
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
// ADMIN — READ
// ============================================================================

export const getAdminProductById = asyncWrapper(async (req, res) => {
  const product = await productService.getProductByIdForAdmin(req.params.id);

  return successResponse({
    res,
    message: "Product fetched successfully",
    data: toAdminDetail(product),
  });
});

export const getAdminProducts = asyncWrapper(async (req, res) => {
  const result = await productService.getProducts(
    req.validated?.query ?? req.query,
  );

  return successResponse({
    res,
    message: "Products fetched successfully",
    data: { products: toAdminList(result.products) },
    meta: { pagination: result.meta },
  });
});

// ============================================================================
// ADMIN — WRITE
// ============================================================================

export const createProduct = asyncWrapper(async (req, res) => {
  const payload = buildProductPayload(req);
  const product = await productService.createProduct(payload);

  return successResponse({
    res,
    statusCode: 201,
    message: "Product created successfully",
    data: toAdminDetail(product),
  });
});

export const updateProduct = asyncWrapper(async (req, res) => {
  const payload = buildProductPayload(req);
  const product = await productService.updateProduct(req.params.id, payload);

  return successResponse({
    res,
    message: "Product updated successfully",
    data: toAdminDetail(product),
  });
});

export const updateProductStatus = asyncWrapper(async (req, res) => {
  const { status } = req.body;
  const product = await productService.updateProductStatus(
    req.params.id,
    status,
  );

  return successResponse({
    res,
    message: "Product status updated successfully",
    data: toAdminDetail(product),
  });
});

export const archiveProduct = asyncWrapper(async (req, res) => {
  const { reason } = req.body ?? {};
  const result = await productService.archiveProduct(req.params.id, {
    reason,
    archivedBy: req.user?.id,
  });

  return successResponse({
    res,
    message: "Product archived successfully",
    data: result,
  });
});

// ============================================================================
// ADMIN — CREATE SINGLE VARIANT FOR PRODUCT
// ============================================================================

export const createVariantForProduct = asyncWrapper(async (req, res) => {
  const productId = req.params.id;
  const payload = { ...req.body, productId };

  const variant = await productService.createVariant(payload);

  return successResponse({
    res,
    statusCode: 201,
    message: "Variant created successfully",
    data: variant,
  });
});
