import { Router } from "express";

import {
  validateBody,
  validateParams,
} from "../../middlewares/validateMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import { uploadItemImages } from "../../middlewares/uploadMiddleware.js";
import { processItemImages } from "../../middlewares/processItemImages.js";
import * as itemController from "./item.controller.js";
import {
  createItemSchema,
  updateItemSchema,
  itemIdSchema,
} from "./item.validation.js";

const itemRouter = Router();

itemRouter.get("/", itemController.getItems);
itemRouter.get(
  "/:id",
  validateParams(itemIdSchema),
  itemController.getItemById,
);

itemRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  uploadItemImages,
  processItemImages,
  validateBody(createItemSchema),
  itemController.createItem,
);

itemRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(itemIdSchema),
  uploadItemImages,
  processItemImages,
  validateBody(updateItemSchema),
  itemController.updateItem,
);

itemRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  validateParams(itemIdSchema),
  itemController.deleteItem,
);

export default itemRouter;
