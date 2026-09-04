// modules/brands/brand.routes.js
import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";
import {parseMultipartJsonFields} from "../../middlewares/parseMultipartJson.js"
import { uploadSingleImage } from "../../middlewares/uploadMiddleware.js";
import { processSingleImage } from "../../middlewares/processItemImages.js";
import * as brandController from "./brand.controller.js";
import {
  createBrandSchema,
  updateBrandSchema,
  brandIdSchema,
  brandSlugSchema,
  getBrandsQuerySchema,
} from "./brand.validation.js";

const brandRouter = Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────
brandRouter.get(
  "/",
  validateQuery(getBrandsQuerySchema),
  brandController.getBrands,
);

brandRouter.get(
  "/slug/:slug",
  validateParams(brandSlugSchema),
  brandController.getBrandBySlug,
);

brandRouter.get(
  "/:id",
  validateParams(brandIdSchema),
  brandController.getBrandById,
);

// ─── ADMIN ROUTES ────────────────────────────────────────────
brandRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  uploadSingleImage, // Handle logo upload
  processSingleImage("keplex/brands"),
  parseMultipartJsonFields,
  validateBody(createBrandSchema),
  brandController.createBrand,
);

brandRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  uploadSingleImage, // Handle logo upload for update
  processSingleImage("keplex/brands"), // Process and upload to Cloudinary
  validateParams(brandIdSchema),
  validateBody(updateBrandSchema),
  brandController.updateBrand,
);

brandRouter.patch(
  "/:id/logo",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(brandIdSchema),
  uploadSingleImage,
  parseMultipartJsonFields,
  processSingleImage("keplex/brands"),
  brandController.updateBrandLogo,
);

brandRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  validateParams(brandIdSchema),
  brandController.deleteBrand,
);

export default brandRouter;
