import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";
import { uploadSingleImage } from "../../middlewares/uploadMiddleware.js";
import { processSingleImage } from "../../middlewares/processItemImages.js";
import { parseCategoryMultipart } from "../../middlewares/parseProductMultipart.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import * as categoryController from "./category.controller.js";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
  categorySlugSchema,
  getCategoriesQuerySchema,
} from "./category.validation.js";



const categoryRouter = Router();

/*
|--------------------------------------------------------------------------
| Public
|--------------------------------------------------------------------------
*/

categoryRouter.get(
  "/",
  validateQuery(getCategoriesQuerySchema),
  categoryController.getCategories,
);

categoryRouter.get(
  "/slug/:slug",
  validateParams(categorySlugSchema),
  categoryController.getCategoryBySlug,
);

/*
|--------------------------------------------------------------------------
| Admin
|--------------------------------------------------------------------------
*/

categoryRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  uploadSingleImage,
  processSingleImage("keplex/categories"),
  parseCategoryMultipart,
  validateBody(createCategorySchema),
  categoryController.createCategory,
);

categoryRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(categoryIdSchema),
  uploadSingleImage,
  processSingleImage("keplex/categories"),
  parseCategoryMultipart,
  validateBody(updateCategorySchema),
  categoryController.updateCategory,
);

categoryRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  validateParams(categoryIdSchema),
  categoryController.deleteCategory,
);

export default categoryRouter;
