import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";
import * as reviewController from "./review.controller.js";
import {
  createReviewSchema,
  updateReviewSchema,
  reviewIdSchema,
  variantIdSchema,
  moderateReviewSchema,
  addReviewResponseSchema,
  getReviewsQuerySchema,
} from "./review.validation.js";

const reviewRouter = Router();

// ============ Public Routes ============
reviewRouter.get(
  "/variant/:variantId",
  validateParams(variantIdSchema),
  validateQuery(getReviewsQuerySchema),
  reviewController.getVariantReviews,
);

reviewRouter.get(
  "/variant/:variantId/stats",
  validateParams(variantIdSchema),
  reviewController.getVariantReviewStats,
);

// ============ Customer Routes (Auth Required) ============
reviewRouter.use(authMiddleware);

reviewRouter.post(
  "/",
  validateBody(createReviewSchema),
  reviewController.createReview,
);

reviewRouter.get(
  "/me",
  validateQuery(getReviewsQuerySchema),
  reviewController.getMyReviews,
);

reviewRouter.get(
  "/:id",
  validateParams(reviewIdSchema),
  reviewController.getReviewById,
);

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

// ============ Admin Routes ============
reviewRouter.get(
  "/admin/all",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateQuery(getReviewsQuerySchema),
  reviewController.getAllReviews,
);

reviewRouter.patch(
  "/admin/:id/moderate",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(reviewIdSchema),
  validateBody(moderateReviewSchema),
  reviewController.moderateReview,
);

reviewRouter.post(
  "/admin/:id/response",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(reviewIdSchema),
  validateBody(addReviewResponseSchema),
  reviewController.addReviewResponse,
);

reviewRouter.delete(
  "/admin/response/:responseId",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  reviewController.deleteReviewResponse,
);

export default reviewRouter;
