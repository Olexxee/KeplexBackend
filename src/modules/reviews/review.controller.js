import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as reviewService from "./review.service.js";

// ============ Customer Endpoints ============

export const createReview = asyncWrapper(async (req, res) => {
  // If images were uploaded via middleware, they'll be in req.body.images
  // or req.body.variantImages depending on which middleware was used
  const reviewData = {
    ...req.body,
    // If using processImages middleware, images are already processed
    // If using processSingleImage, it's in req.uploadedImage
    // Adjust based on your route configuration
  };

  const review = await reviewService.createReview(req.user.id, reviewData);

  return successResponse({
    res,
    statusCode: 201,
    message: "Review submitted successfully",
    data: review,
  });
});

export const getMyReviews = asyncWrapper(async (req, res) => {
  const result = await reviewService.getMyReviews(req.user.id, req.query);

  return successResponse({
    res,
    message: "My reviews fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getReviewById = asyncWrapper(async (req, res) => {
  const review = await reviewService.getReviewById(req.params.id);

  return successResponse({
    res,
    message: "Review fetched successfully",
    data: review,
  });
});

export const updateReview = asyncWrapper(async (req, res) => {
  // If images are being updated, they'll be in req.body
  const updateData = req.body;

  const review = await reviewService.updateReview(
    req.params.id,
    req.user.id,
    updateData,
  );

  return successResponse({
    res,
    message: "Review updated successfully",
    data: review,
  });
});

export const deleteReview = asyncWrapper(async (req, res) => {
  await reviewService.deleteReview(req.params.id, req.user.id);

  return successResponse({
    res,
    message: "Review deleted successfully",
    data: null,
  });
});

export const markHelpful = asyncWrapper(async (req, res) => {
  const review = await reviewService.markHelpful(req.params.id);

  return successResponse({
    res,
    message: "Review marked as helpful",
    data: review,
  });
});

// ============ Public Endpoints ============

export const getVariantReviews = asyncWrapper(async (req, res) => {
  const result = await reviewService.getReviewsByVariant(
    req.params.variantId,
    req.query,
  );

  return successResponse({
    res,
    message: "Variant reviews fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getVariantReviewStats = asyncWrapper(async (req, res) => {
  const stats = await reviewService.getVariantReviewStats(req.params.variantId);

  return successResponse({
    res,
    message: "Review stats fetched successfully",
    data: stats,
  });
});

// ============ Admin Endpoints ============

export const getAllReviews = asyncWrapper(async (req, res) => {
  const result = await reviewService.getAllReviews(req.query);

  return successResponse({
    res,
    message: "All reviews fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const moderateReview = asyncWrapper(async (req, res) => {
  const review = await reviewService.moderateReview(
    req.params.id,
    req.body,
    req.user.id,
  );

  return successResponse({
    res,
    message: "Review moderated successfully",
    data: review,
  });
});

export const addReviewResponse = asyncWrapper(async (req, res) => {
  const response = await reviewService.addReviewResponse(
    req.params.id,
    req.user.id,
    req.body.comment,
  );

  return successResponse({
    res,
    statusCode: 201,
    message: "Response added successfully",
    data: response,
  });
});

export const deleteReviewResponse = asyncWrapper(async (req, res) => {
  await reviewService.deleteReviewResponse(req.params.responseId, req.user.id);

  return successResponse({
    res,
    message: "Response deleted successfully",
    data: null,
  });
});
