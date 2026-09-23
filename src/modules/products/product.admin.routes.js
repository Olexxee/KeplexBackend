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
import {
  parseProductMultipart,
  parseVariantMultipart,
} from "../../middlewares/parseProductMultipart.js";
import * as productController from "./product.controller.js";
import * as variantController from "../variants/variant.controller.js";
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  getAdminProductsQuerySchema,
  updateProductStatusSchema,
  createSingleVariantSchema,
  bulkCreateVariantsSchema,
} from "./product.validation.js";



const adminProductRouter = Router();

adminProductRouter.use(authMiddleware);
adminProductRouter.use(roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"));

// ============================================================================
// PRODUCTS
// ============================================================================

adminProductRouter.get(
  "/",
  validateQuery(getAdminProductsQuerySchema),
  productController.getAdminProducts,
);

adminProductRouter.post(
  "/",
  uploadVariantImages,
  processVariantImages,
  parseProductMultipart,
  validateBody(createProductSchema),
  productController.createProduct,
);

adminProductRouter.get(
  "/:id",
  validateParams(productIdSchema),
  productController.getAdminProductById,
);

adminProductRouter.patch(
  "/:id",
  uploadVariantImages,
  processVariantImages,
  parseProductMultipart,
  validateParams(productIdSchema),
  validateBody(updateProductSchema),
  productController.updateProduct,
);

adminProductRouter.patch(
  "/:id/status",
  validateParams(productIdSchema),
  validateBody(updateProductStatusSchema),
  productController.updateProductStatus,
);

adminProductRouter.delete(
  "/:id",
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  validateParams(productIdSchema),
  productController.archiveProduct,
);

// ============================================================================
// VARIANTS — nested for "create for this product"
// ============================================================================

adminProductRouter.post(
  "/:id/variants",
  uploadVariantImages,
  processVariantImages,
  parseVariantMultipart,
  validateParams(productIdSchema),
  // Inject productId before validation so the schema can require it.
  (req, _res, next) => {
    req.body.productId = req.params.id;
    next();
  },
  validateBody(createSingleVariantSchema),
  productController.createVariantForProduct,
);

adminProductRouter.post(
  "/:id/variants/bulk",
  uploadVariantImages,
  processVariantImages,
  parseProductMultipart,
  validateParams(productIdSchema),
  validateBody(bulkCreateVariantsSchema),
  variantController.bulkCreateVariants,
);

export default adminProductRouter;
