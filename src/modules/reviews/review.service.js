// modules/reviews/review.service.js
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "../../classes/errorClasses.js";
import {
  getPaginationParams,
  buildPaginationMeta,
} from "../../lib/pagination.js";
import * as reviewDb from "./review.db.js";
import * as variantDb from "../variants/variant.db.js";
import * as orderDb from "../orders/order.db.js";

export const createReview = async (userId, payload) => {
  const { variantId, orderId, rating, title, comment, images } = payload;

  // Check if variant exists
  const variant = await variantDb.findVariantById(variantId);
  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  // Check if user already reviewed this variant
  const existing = await reviewDb.findReviewsByUser(userId);
  const alreadyReviewed = existing.reviews.some(
    (r) => r.variantId === variantId,
  );
  if (alreadyReviewed) {
    throw new BadRequestError("You have already reviewed this product");
  }

  // If orderId provided, verify user purchased this variant
  if (orderId) {
    const order = await orderDb.findOrderById(orderId);
    if (!order || order.userId !== userId) {
      throw new BadRequestError("Invalid order");
    }
    const hasVariant = order.items.some((item) => item.variantId === variantId);
    if (!hasVariant) {
      throw new BadRequestError(
        "You did not purchase this product in this order",
      );
    }
  }

  const review = await reviewDb.createReview({
    userId,
    variantId,
    orderId: orderId || null,
    rating,
    title,
    comment,
    images,
    isVerified: !!orderId,
    status: "PENDING",
  });

  return review;
};

export const getReviewsByVariant = async (variantId, filters) => {
  const { page = 1, limit = 10, status = "APPROVED" } = filters;
  const { skip, take } = getPaginationParams(page, limit);

  const { reviews, total } = await reviewDb.findReviewsByVariant(variantId, {
    skip,
    take,
    status,
  });

  return {
    data: reviews,
    meta: buildPaginationMeta({
      page,
      limit,
      total,
    }),
  };
};

export const getMyReviews = async (userId, filters) => {
  const { page = 1, limit = 10 } = filters;
  const { skip, take } = getPaginationParams(page, limit);

  const { reviews, total } = await reviewDb.findReviewsByUser(userId, {
    skip,
    take,
  });

  return {
    data: reviews,
    meta: buildPaginationMeta({
      page,
      limit,
      total,
    }),
  };
};

export const getAllReviews = async (filters) => {
  const {
    page = 1,
    limit = 20,
    variantId,
    userId,
    status,
    search,
    startDate,
    endDate,
  } = filters;
  const { skip, take } = getPaginationParams(page, limit);

  const { reviews, total } = await reviewDb.findReviews({
    variantId,
    userId,
    status,
    search,
    startDate,
    endDate,
    skip,
    take,
  });

  return {
    data: reviews,
    meta: buildPaginationMeta({
      page,
      limit,
      total,
    }),
  };
};

export const getReviewById = async (id) => {
  const review = await reviewDb.findReviewById(id);
  if (!review) {
    throw new NotFoundError("Review not found");
  }
  return review;
};

export const updateReview = async (id, userId, payload) => {
  const review = await reviewDb.findReviewById(id);
  if (!review) {
    throw new NotFoundError("Review not found");
  }

  if (review.userId !== userId) {
    throw new ForbiddenError("You can only update your own reviews");
  }

  // Only allow updating before approval
  if (review.status !== "PENDING") {
    throw new BadRequestError("Cannot update review after moderation");
  }

  return reviewDb.updateReview(id, payload);
};

export const deleteReview = async (id, userId) => {
  const review = await reviewDb.findReviewById(id);
  if (!review) {
    throw new NotFoundError("Review not found");
  }

  if (review.userId !== userId) {
    throw new ForbiddenError("You can only delete your own reviews");
  }

  return reviewDb.deleteReview(id);
};

export const moderateReview = async (id, payload, adminUserId) => {
  const { status, response } = payload;
  const review = await reviewDb.findReviewById(id);
  if (!review) {
    throw new NotFoundError("Review not found");
  }

  // Update review status
  const updated = await reviewDb.updateReview(id, { status });

  // Add admin response if provided
  if (response) {
    await reviewDb.createReviewResponse({
      reviewId: id,
      userId: adminUserId,
      comment: response,
    });
  }

  return updated;
};

export const getVariantReviewStats = async (variantId) => {
  const variant = await variantDb.findVariantById(variantId);
  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  return reviewDb.getVariantReviewStats(variantId);
};

export const markHelpful = async (id) => {
  const review = await reviewDb.findReviewById(id);
  if (!review) {
    throw new NotFoundError("Review not found");
  }

  return reviewDb.updateReviewHelpfulness(id, true);
};

export const addReviewResponse = async (reviewId, adminUserId, comment) => {
  const review = await reviewDb.findReviewById(reviewId);
  if (!review) {
    throw new NotFoundError("Review not found");
  }

  return reviewDb.createReviewResponse({
    reviewId,
    userId: adminUserId,
    comment,
  });
};

export const deleteReviewResponse = async (id, adminUserId) => {
  const response = await reviewDb.findReviewResponseById(id);
  if (!response) {
    throw new NotFoundError("Response not found");
  }

  return reviewDb.deleteReviewResponse(id);
};
