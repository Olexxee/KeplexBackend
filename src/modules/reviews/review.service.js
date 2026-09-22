import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "../../classes/errorClasses.js";
import { prisma } from "../../config/prisma.js";
import {
  getPaginationParams,
  buildPaginationMeta,
} from "../../lib/pagination.js";
import * as reviewDb from "./review.db.js";
import * as variantDb from "../variants/variant.db.js";
import * as orderDb from "../order/order.db.js";
import { deleteMultipleFromCloudinary } from "../../config/cloudinaryService.js";

const MAX_REVIEW_IMAGES = 3;

// ============================================================
// HELPERS
// ============================================================

const getReviewImages = (images = []) =>
  images.map((image, index) => ({
    url: image.url,
    publicId: image.publicId,
    mimeType: image.mimeType || null,
    bytes: image.bytes ?? null,
    format: image.format || null,
    width: image.width ?? null,
    height: image.height ?? null,
    sortOrder: index,
  }));

const cleanupCloudinaryImages = async (images = []) => {
  if (!images.length) return;

  try {
    await deleteMultipleFromCloudinary(images);
  } catch (error) {
    console.error("Failed to clean up Cloudinary review images:", error);
  }
};

// ============================================================
// CUSTOMER
// ============================================================

export const createReview = async (userId, payload) => {
  const { variantId, orderId, rating, title, comment, images = [] } = payload;

  // Images have already been uploaded by middleware at this point.
  // Therefore, every failure after this point must clean them up.
  const reviewImages = getReviewImages(images);

  try {
    if (reviewImages.length > MAX_REVIEW_IMAGES) {
      throw new BadRequestError(
        `A review can contain a maximum of ${MAX_REVIEW_IMAGES} images`,
      );
    }

    const variant = await variantDb.findVariantById(variantId);

    if (!variant) {
      throw new NotFoundError("Variant not found");
    }

    const existingReview = await reviewDb.findReviewByUserAndVariant(
      userId,
      variantId,
    );

    if (existingReview) {
      throw new BadRequestError(
        "You have already reviewed this product variant",
      );
    }

    let verifiedPurchase = false;

    if (orderId) {
      const order = await orderDb.findOrderById(orderId);

      if (!order || order.userId !== userId) {
        throw new BadRequestError("Invalid order");
      }

      const hasVariant = order.items.some(
        (item) => item.variantId === variantId,
      );

      if (!hasVariant) {
        throw new BadRequestError(
          "You did not purchase this product variant in this order",
        );
      }

      if (!["DELIVERED", "COMPLETED"].includes(order.status)) {
        throw new BadRequestError(
          "You can only submit a verified review after the order has been delivered",
        );
      }

      verifiedPurchase = true;
    }

    const review = await prisma.$transaction(async (tx) => {
      const createdReview = await reviewDb.createReview(
        {
          userId,
          variantId,
          orderId: orderId || null,
          rating,
          title: title || null,
          comment: comment || null,
          isVerified: verifiedPurchase,
          status: "PENDING",
        },
        tx,
      );

      if (reviewImages.length > 0) {
        await reviewDb.createReviewImages(
          reviewImages.map((image) => ({
            reviewId: createdReview.id,
            ...image,
          })),
          tx,
        );
      }

      return reviewDb.findReviewById(createdReview.id, tx);
    });

    return review;
  } catch (error) {
    await cleanupCloudinaryImages(reviewImages);
    throw error;
  }
};

export const getReviewsByVariant = async (variantId, filters = {}) => {
  const { page = 1, limit = 10 } = filters;

  const variant = await variantDb.findVariantById(variantId);

  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  const { skip, take } = getPaginationParams(page, limit);

  const { reviews, total } = await reviewDb.findReviewsByVariant(variantId, {
    skip,
    take,
    status: "APPROVED",
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

export const getMyReviews = async (userId, filters = {}) => {
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

export const getAllReviews = async (filters = {}) => {
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

  const images = review.images || [];

  await reviewDb.deleteReview(id);

  await cleanupCloudinaryImages(images);

  return {
    id,
    deleted: true,
  };
};

export const moderateReview = async (id, payload, adminUserId) => {
  const { status, response } = payload;

  const review = await reviewDb.findReviewById(id);

  if (!review) {
    throw new NotFoundError("Review not found");
  }

  return prisma.$transaction(async (tx) => {
    await reviewDb.updateReview(id, { status }, tx);

    if (response) {
      await reviewDb.createReviewResponse(
        {
          reviewId: id,
          userId: adminUserId,
          comment: response,
        },
        tx,
      );
    }

    return reviewDb.findReviewById(id, tx);
  });
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

  if (review.status !== "APPROVED") {
    throw new BadRequestError("Only approved reviews can be marked as helpful");
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

  if (response.userId !== adminUserId) {
    throw new ForbiddenError("You can only delete your own review responses");
  }

  return reviewDb.deleteReviewResponse(id);
};
