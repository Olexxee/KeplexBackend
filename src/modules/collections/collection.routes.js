import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import {
    validateBody,
    validateParams,
    validateQuery,
} from "../../middlewares/validateMiddleware.js";
import { upload } from "../../config/multer.js";
import { processSingleUpload } from "../../middlewares/uploadMiddleware.js";
import * as collectionController from "./collection.controller.js";
import {
  createCollectionSchema,
  updateCollectionSchema,
  collectionIdSchema,
  collectionSlugSchema,
  getCollectionsQuerySchema,
} from "./collection.validation.js";

const collectionRouter = Router();

// Public routes
collectionRouter.get(
  "/",
  validateQuery(getCollectionsQuerySchema),
  collectionController.getCollections,
);

collectionRouter.get(
  "/slug/:slug",
  validateParams(collectionSlugSchema),
  collectionController.getCollectionBySlug,
);

collectionRouter.get(
  "/:id",
  validateParams(collectionIdSchema),
  collectionController.getCollectionById,
);


collectionRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  upload.single("image"),
  processSingleUpload({
    folder: "keplex-collections",
  }),
  validateBody(createCollectionSchema),
  collectionController.createCollection,
);

collectionRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  upload.single("image"),
  processSingleUpload({
    folder: "keplex-collections",
  }),
  validateParams(collectionIdSchema),
  validateBody(updateCollectionSchema),
  collectionController.updateCollection,
);

collectionRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  validateParams(collectionIdSchema),
  collectionController.deleteCollection,
);

export default collectionRouter;
