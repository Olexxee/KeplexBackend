import { Router } from "express";

import {
  validateBody,
  validateParams,
} from "../../middlewares/validateMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import * as categoryController from "./category.controller.js";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
} from "./category.validation.js";

const categoryRouter = Router();

categoryRouter.get("/", categoryController.getCategories);

categoryRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateBody(createCategorySchema),
  categoryController.createCategory,
);

categoryRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(categoryIdSchema),
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
