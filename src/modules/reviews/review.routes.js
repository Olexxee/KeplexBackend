import { Router } from "express";
import * as reviewController from "./review.controller.js";
import {
  createReviewSchema,
  createReviewFieldsSchema,
  updateReviewSchema,
  moderateReviewSchema,
  addReviewResponseSchema,
  reviewIdSchema,
  variantIdSchema,
  getPublicReviewsQuerySchema,
  getMyReviewsQuerySchema,
  getAdminReviewsQuerySchema,
} from "./review.validation.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../middlewares/validateMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware  } from "../../middlewares/roleMiddleware.js";
import { processImages } from "../../middlewares/processItemImages.js";
import { uploadReviewImages } from "../../middlewares/uploadMiddleware.js";

const reviewRouter = Router();

// ============================================================
// PUBLIC
// ============================================================

reviewRouter.get(
  "/variant/:variantId",
  validateParams(variantIdSchema),
  validateQuery(getPublicReviewsQuerySchema),
  reviewController.getVariantReviews,
);

reviewRouter.get(
  "/variant/:variantId/stats",
  validateParams(variantIdSchema),
  reviewController.getVariantReviewStats,
);

// ============================================================
// AUTHENTICATED
// ============================================================

reviewRouter.use(authMiddleware);

// ============================================================
// CUSTOMER — CREATE
// ============================================================

reviewRouter.post(
  "/",
  uploadReviewImages,
  validateBody(createReviewFieldsSchema),
  processImages("images", "keplex/reviews"),
  validateBody(createReviewSchema),
  reviewController.createReview,
);

// ============================================================
// CUSTOMER — READ
// ============================================================

reviewRouter.get(
  "/me",
  validateQuery(getMyReviewsQuerySchema),
  reviewController.getMyReviews,
);

reviewRouter.get(
  "/:id",
  validateParams(reviewIdSchema),
  reviewController.getReviewById,
);

// ============================================================
// CUSTOMER — UPDATE / DELETE
// ============================================================

reviewRouter.patch(
  "/:id",
  validateParams(reviewIdSchema),
  validateBody(updateReviewSchema),
  reviewController.updateReview,
);

reviewRouter.delete(
  "/:id",
  validateParams(reviewIdSchema),
  reviewController.deleteReview,
);

reviewRouter.patch(
  "/:id/helpful",
  validateParams(reviewIdSchema),
  reviewController.markHelpful,
);

// ============================================================
// ADMIN
// ============================================================

reviewRouter.get(
  "/admin/all",
  roleMiddleware("ADMIN", "SUPER_ADMIN", "STAFF"),
  validateQuery(getAdminReviewsQuerySchema),
  reviewController.getAllReviews,
);

reviewRouter.patch(
  "/admin/:id/moderate",
  roleMiddleware ("ADMIN", "SUPER_ADMIN", "STAFF"),
  validateParams(reviewIdSchema),
  validateBody(moderateReviewSchema),
  reviewController.moderateReview,
);

reviewRouter.post(
  "/admin/:id/response",
  roleMiddleware ("ADMIN", "SUPER_ADMIN", "STAFF"),
  validateParams(reviewIdSchema),
  validateBody(addReviewResponseSchema),
  reviewController.addReviewResponse,
);

reviewRouter.delete(
  "/admin/response/:responseId",
  roleMiddleware ("ADMIN", "SUPER_ADMIN", "STAFF"),
  reviewController.deleteReviewResponse,
);

export default reviewRouter;
