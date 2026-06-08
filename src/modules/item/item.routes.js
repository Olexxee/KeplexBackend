import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import { uploadItemImages } from "../../middlewares/uploadMiddleware.js";
import { processTrainingImage } from "../../middlewares/processItemImages.js";
import { parseMultipartJsonFields } from "../../middlewares/parseMultipartJson.js";
import {validateQuery, validateBody, validateParams} from "../../middlewares/validateMiddleware.js";
import * as itemController from "./item.controller.js";
import {
  createItemSchema,
  updateItemSchema,
  itemIdSchema,
  getItemsQuerySchema,
} from "./item.validation.js";

const itemRouter = Router();

itemRouter.get(
  "/",
  validateQuery(getItemsQuerySchema),
  itemController.getItems,
);

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
  parseMultipartJsonFields(["features", "specifications"]), // before processItemImages
  processTrainingImage,
  validateBody(createItemSchema),
  itemController.createItem,
);

itemRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(itemIdSchema),
  uploadItemImages,
  processTrainingImage,
  parseMultipartJsonFields(["features", "specifications"]),
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
