// modules/variants/variant.routes.js
import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";
import { uploadVariantImages } from "../../middlewares/uploadMiddleware.js";
import { processVariantImages } from "../../middlewares/processMedia.js";
import * as controller from "./variant.controller.js";
import {
  createVariantSchema,
  updateVariantSchema,
  variantIdSchema,
  productIdSchema,
  bulkCreateVariantsSchema,
  getVariantsQuerySchema,
} from "./variant.validation.js";

const router = Router();

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

router.get(
  "/product/:productId",
  validateParams(productIdSchema),
  validateQuery(getVariantsQuerySchema),
  controller.getProductVariants,
);

router.get("/:id", validateParams(variantIdSchema), controller.getVariant);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// Create variant with images
router.post(
  "/",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  uploadVariantImages, // Uploads variant images to req.files
  processVariantImages, // Processes images, attaches to req.body.variantImages
  validateBody(createVariantSchema),
  controller.createVariant,
);

router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(variantIdSchema),
  validateBody(updateVariantSchema),
  controller.updateVariant,
);

// Update variant images separately
router.patch(
  "/:id/images",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(variantIdSchema),
  uploadVariantImages,
  processVariantImages,
  controller.updateVariantImages,
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  validateParams(variantIdSchema),
  controller.deleteVariant,
);

// Bulk create variants with images
router.post(
  "/product/:productId/bulk",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(productIdSchema),
  uploadVariantImages,
  processVariantImages,
  validateBody(bulkCreateVariantsSchema),
  controller.bulkCreateVariants,
);

export default router;
