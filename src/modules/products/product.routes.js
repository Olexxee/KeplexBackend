import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";

import { uploadVariantImages } from "../../middlewares/uploadMiddleware.js";
import { processVariantImages } from "../../middlewares/processItemImages.js";
import { parseProductMultipart } from "../../middlewares/parseProductMultipart.js";

import * as productController from "./product.controller.js";

import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  productSlugSchema,
  getProductsQuerySchema,
  updateProductStatusSchema,
} from "./product.validation.js";

const productRouter = Router();

// ============================================================================
// PUBLIC ROUTES — READ
// ============================================================================

// --------------------------------------------------------------------------
// Product catalog
// GET /api/products
// --------------------------------------------------------------------------

productRouter.get(
  "/",
  validateQuery(getProductsQuerySchema),
  productController.getProducts,
);

// --------------------------------------------------------------------------
// Product collections
// GET /api/products/featured
// GET /api/products/new-arrivals
// GET /api/products/best-sellers
// --------------------------------------------------------------------------

productRouter.get(
  "/featured",
  validateQuery(getProductsQuerySchema),
  productController.getFeaturedProducts,
);

productRouter.get(
  "/new-arrivals",
  validateQuery(getProductsQuerySchema),
  productController.getNewArrivals,
);

productRouter.get(
  "/best-sellers",
  validateQuery(getProductsQuerySchema),
  productController.getBestSellers,
);

// --------------------------------------------------------------------------
// Product by slug
// IMPORTANT: Must remain before "/:id"
// GET /api/products/slug/:slug
// --------------------------------------------------------------------------

productRouter.get(
  "/slug/:slug",
  validateParams(productSlugSchema),
  productController.getProductBySlug,
);

// --------------------------------------------------------------------------
// Product related products
// GET /api/products/:id/related
// --------------------------------------------------------------------------

productRouter.get(
  "/:id/related",
  validateParams(productIdSchema),
  validateQuery(getProductsQuerySchema),
  productController.getRelatedProducts,
);

// --------------------------------------------------------------------------
// Product variants
// GET /api/products/:id/variants
// --------------------------------------------------------------------------

productRouter.get(
  "/:id/variants",
  validateParams(productIdSchema),
  productController.getProductVariants,
);

// --------------------------------------------------------------------------
// Product by ID
// IMPORTANT: Keep this LAST among the public GET routes.
// GET /api/products/:id
// --------------------------------------------------------------------------

productRouter.get(
  "/:id",
  validateParams(productIdSchema),
  productController.getProductById,
);

// ============================================================================
// ADMIN ROUTES — WRITE
// ============================================================================

// --------------------------------------------------------------------------
// Create product
// POST /api/products
// --------------------------------------------------------------------------

productRouter.post(
  "/",
  authMiddleware,
  roleMiddleware(
    "SUPER_ADMIN",
    "ADMIN",
    "STAFF",
  ),
  uploadVariantImages,
  processVariantImages,
  parseProductMultipart,
  validateBody(createProductSchema),
  productController.createProduct,
);

// --------------------------------------------------------------------------
// Update product
// PATCH /api/products/:id
// --------------------------------------------------------------------------

productRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(
    "SUPER_ADMIN",
    "ADMIN",
    "STAFF",
  ),
  uploadVariantImages,
  processVariantImages,
  parseProductMultipart,
  validateParams(productIdSchema),
  validateBody(updateProductSchema),
  productController.updateProduct,
);

// --------------------------------------------------------------------------
// Update product status
// PATCH /api/products/:id/status
// --------------------------------------------------------------------------

productRouter.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware(
    "SUPER_ADMIN",
    "ADMIN",
    "STAFF",
  ),
  validateParams(productIdSchema),
  validateBody(updateProductStatusSchema),
  productController.updateProductStatus,
);

// --------------------------------------------------------------------------
// Delete product
// DELETE /api/products/:id
// --------------------------------------------------------------------------

productRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(
    "SUPER_ADMIN",
    "ADMIN",
  ),
  validateParams(productIdSchema),
  productController.deleteProduct,
);

export default productRouter;