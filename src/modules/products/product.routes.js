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
  createSingleVariantSchema,
} from "./product.validation.js";

const productRouter = Router();

// ============================================================================
// PUBLIC — READ
// ============================================================================

productRouter.get(
  "/",
  validateQuery(getProductsQuerySchema),
  productController.getProducts,
);

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

productRouter.get(
  "/slug/:slug",
  validateParams(productSlugSchema),
  productController.getProductBySlug,
);

productRouter.get(
  "/:id/related",
  validateParams(productIdSchema),
  validateQuery(getProductsQuerySchema),
  productController.getRelatedProducts,
);

productRouter.get(
  "/:id/variants",
  validateParams(productIdSchema),
  productController.getProductVariants,
);

// ============================================================================
// ADMIN — READ
// MUST come before `/:id` so "/admin" isn't captured as an id.
// ============================================================================

productRouter.get(
  "/admin/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(productIdSchema),
  productController.getAdminProductById,
);

// ============================================================================
// PUBLIC — BY ID (LAST among public GETs)
// ============================================================================

productRouter.get(
  "/:id",
  validateParams(productIdSchema),
  productController.getProductById,
);

// ============================================================================
// ADMIN — WRITE
// ============================================================================

productRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  uploadVariantImages,
  processVariantImages,
  parseProductMultipart,
  validateBody(createProductSchema),
  productController.createProduct,
);

productRouter.post(
  "/:id/variants",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  uploadVariantImages,
  processVariantImages,
  parseProductMultipart,
  validateParams(productIdSchema),
  validateBody(createSingleVariantSchema),
  productController.createVariantForProduct,
);

productRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  uploadVariantImages,
  processVariantImages,
  parseProductMultipart,
  validateParams(productIdSchema),
  validateBody(updateProductSchema),
  productController.updateProduct,
);

productRouter.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(productIdSchema),
  validateBody(updateProductStatusSchema),
  productController.updateProductStatus,
);

// DELETE archives (soft if history, hard if not). This matches the
// frontend's `deleteProduct` / `archiveProduct` client, which both call
// DELETE with an optional `reason` body.
productRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  validateParams(productIdSchema),
  productController.archiveProduct,
);

export default productRouter;
