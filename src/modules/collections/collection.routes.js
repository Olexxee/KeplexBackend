import { Router } from "express";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";

import { uploadSingleImage } from "../../middlewares/uploadMiddleware.js";
import { processSingleImage } from "../../middlewares/processItemImages.js";

import * as collectionController from "./collection.controller.js";

import {
  createCollectionSchema,
  updateCollectionSchema,
  collectionIdSchema,
  collectionSlugSchema,
  getCollectionsQuerySchema,
} from "./collection.validation.js";

const collectionRouter = Router();

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

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

// ============================================================================
// PROTECTED ROUTES
// ============================================================================

collectionRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),

  uploadSingleImage,

  processSingleImage("keplex/collections"),

  validateBody(createCollectionSchema),

  collectionController.createCollection,
);

collectionRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),

  uploadSingleImage,

  processSingleImage("keplex/collections"),

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
