import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";
import * as brandController from "./brand.controller.js";
import {
  createBrandSchema,
  updateBrandSchema,
  brandIdSchema,
  brandSlugSchema,
  getBrandsQuerySchema,
} from "./brand.validation.js";

const brandRouter = Router();

// Public routes
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

// Admin routes
brandRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateBody(createBrandSchema),
  brandController.createBrand,
);

brandRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(brandIdSchema),
  validateBody(updateBrandSchema),
  brandController.updateBrand,
);

brandRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  validateParams(brandIdSchema),
  brandController.deleteBrand,
);

export default brandRouter;
