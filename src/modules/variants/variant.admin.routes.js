import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import {
  validateBody,
  validateParams,
} from "../../middlewares/validateMiddleware.js";
import { uploadVariantImages } from "../../middlewares/uploadMiddleware.js";
import { processVariantImages } from "../../middlewares/processItemImages.js";
import { parseVariantMultipart } from "../../middlewares/parseProductMultipart.js";
import * as controller from "./variant.controller.js";
import {
  updateVariantAdminSchema,
  variantIdSchema,
} from "./variant.validation.js";

const variantAdminRouter = Router();

variantAdminRouter.use(authMiddleware);
variantAdminRouter.use(roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"));

variantAdminRouter.get("/:id", validateParams(variantIdSchema), controller.getVariant);

variantAdminRouter.patch(
  "/:id",
  uploadVariantImages,
  processVariantImages,
  parseVariantMultipart,
  validateParams(variantIdSchema),
  validateBody(updateVariantAdminSchema),
  controller.updateVariant,
);

variantAdminRouter.patch(
  "/:id/images",
  validateParams(variantIdSchema),
  uploadVariantImages,
  processVariantImages,
  controller.updateVariantImages,
);

variantAdminRouter.delete(
  "/:id",
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  validateParams(variantIdSchema),
  controller.archiveVariant,
);

variantAdminRouter.post(
  "/:id/restore",
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  validateParams(variantIdSchema),
  controller.restoreVariant,
);

export default variantAdminRouter;
