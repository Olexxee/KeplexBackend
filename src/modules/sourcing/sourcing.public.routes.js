import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";
import { uploadSourcingImages } from "../../middlewares/uploadMiddleware.js";
import { processSourcingImages } from "../../middlewares/processItemImages.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import * as sourcingController from "./sourcing.controller.js";
import {
  createSourcingRequestSchema,
  sourcingIdSchema,
  sourcingListQuerySchema,
} from "./sourcing.validation.js";



const sourcingPublicRouter = Router();

/*
 * All customer routes require authentication, but NOT a specific role.
 * Any logged-in user can manage their own sourcing requests.
 */
sourcingPublicRouter.use(authMiddleware);

/*
 * CREATE — multipart upload pipeline:
 *   1. uploadSourcingImages  → parse multipart, populate req.files
 *   2. processSourcingImages → resize/optimize, populate req.body image refs
 *   3. validateBody          → validate the final payload (incl. processed images)
 *   4. controller            → persist
 *
 * Middleware order is critical: body validation MUST come AFTER media
 * processing, because non-file fields are only fully parsed after the
 * multipart middleware has run, and image URLs are injected by the
 * processor before validation sees them.
 */
sourcingPublicRouter.post(
  "/",
  uploadSourcingImages,
  processSourcingImages,
  validateBody(createSourcingRequestSchema),
  sourcingController.createSourcingRequest,
);

sourcingPublicRouter.get(
  "/",
  validateQuery(sourcingListQuerySchema),
  sourcingController.getMySourcingRequests,
);

sourcingPublicRouter.get(
  "/:id",
  validateParams(sourcingIdSchema),
  sourcingController.getMySourcingRequest,
);

export default sourcingPublicRouter;
