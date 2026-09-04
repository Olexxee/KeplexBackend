import * as trainingService from "./trainingProgram.service.js";
import * as trainingMediaService from "./trainingProgramMedia.service.js";
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import { BadRequestError } from "../../classes/errorClasses.js";

export const createTraining = asyncWrapper(async (req, res) => {
  // If there are any images in the request body from middleware
  const trainingData = {
    ...req.body,
    // If using processImages middleware, images are in req.body.images
    // If using processSingleImage, it's in req.uploadedImage
  };

  const result = await trainingService.createTrainingProgram(trainingData);
  return successResponse({
    res,
    statusCode: 201,
    message: "Training program created",
    data: result,
  });
});

export const updateTraining = asyncWrapper(async (req, res) => {
  // If images are being updated, they'll be in req.body
  const updateData = req.body;

  const result = await trainingService.updateTrainingProgram(
    req.params.id,
    updateData,
  );
  return successResponse({
    res,
    message: "Training program updated",
    data: result,
  });
});

export const deleteTraining = asyncWrapper(async (req, res) => {
  const result = await trainingService.deleteTrainingProgram(req.params.id);
  return successResponse({
    res,
    message: "Training program deleted",
    data: result,
  });
});

export const getTrainingBySlug = asyncWrapper(async (req, res) => {
  const result = await trainingService.getTrainingBySlug(req.params.slug);
  return successResponse({
    res,
    message: "Training program retrieved",
    data: result,
  });
});

export const getTrainingById = asyncWrapper(async (req, res) => {
  const result = await trainingService.getTrainingProgramById(req.params.id);
  return successResponse({
    res,
    message: "Training program retrieved",
    data: result,
  });
});

// public list
export const getTrainings = asyncWrapper(async (_req, res) => {
  const result = await trainingService.getAllTrainingPrograms();
  return successResponse({
    res,
    message: "Training programs retrieved",
    data: result,
  });
});

// admin list — all programs regardless of status
export const getAdminTrainings = asyncWrapper(async (_req, res) => {
  const result = await trainingService.getAdminTrainingPrograms();
  return successResponse({
    res,
    message: "Training programs retrieved",
    data: result,
  });
});

export const toggleTrainingStatus = asyncWrapper(async (req, res) => {
  const { active } = req.body;
  if (typeof active !== "boolean")
    throw new BadRequestError("active must be a boolean");
  const result = await trainingService.toggleTrainingStatus(
    req.params.id,
    active,
  );
  return successResponse({
    res,
    message: "Training status updated",
    data: result,
  });
});

export const toggleFeaturedTraining = asyncWrapper(async (req, res) => {
  const { featured } = req.body;
  if (typeof featured !== "boolean")
    throw new BadRequestError("featured must be a boolean");
  const result = await trainingService.toggleFeaturedTraining(
    req.params.id,
    featured,
  );
  return successResponse({
    res,
    message: "Training featured status updated",
    data: result,
  });
});

// ─── MEDIA UPLOAD ────────────────────────────────────────────────
// This controller handles the upload of a single training image
export const uploadProgramMedia = asyncWrapper(async (req, res) => {
  // The new processSingleImage middleware attaches the processed image to req.uploadedImage
  if (!req.uploadedImage) {
    throw new BadRequestError("No image uploaded or failed to process");
  }

  // req.uploadedImage contains:
  // {
  //   url: string,
  //   publicId: string,
  //   mimeType: string,
  //   bytes: number,
  //   format: string,
  //   width: number,
  //   height: number
  // }

  const result = await trainingMediaService.uploadProgramMedia({
    trainingProgramId: req.params.id,
    file: req.uploadedImage, // Pass the processed image data
  });

  return successResponse({
    res,
    statusCode: 201,
    message: "Media uploaded successfully",
    data: result,
  });
});

// ─── ADDITIONAL MEDIA ENDPOINTS ──────────────────────────────────
// If you need to upload multiple images at once
export const uploadMultipleProgramMedia = asyncWrapper(async (req, res) => {
  // The processImages middleware attaches processed images to req.body.images
  if (!req.body.images || req.body.images.length === 0) {
    throw new BadRequestError("No images uploaded");
  }

  const results = await trainingMediaService.uploadMultipleProgramMedia({
    trainingProgramId: req.params.id,
    files: req.body.images, // Array of processed image data
  });

  return successResponse({
    res,
    statusCode: 201,
    message: "Media uploaded successfully",
    data: results,
  });
});

// If you need to delete media
export const deleteProgramMedia = asyncWrapper(async (req, res) => {
  const result = await trainingMediaService.deleteProgramMedia(
    req.params.mediaId,
    req.params.id, // trainingProgramId
  );

  return successResponse({
    res,
    message: "Media deleted successfully",
    data: result,
  });
});

// If you need to reorder media
export const reorderProgramMedia = asyncWrapper(async (req, res) => {
  const { mediaOrder } = req.body;
  if (!Array.isArray(mediaOrder)) {
    throw new BadRequestError("mediaOrder must be an array of media IDs");
  }

  const result = await trainingMediaService.reorderProgramMedia(
    req.params.id,
    mediaOrder,
  );

  return successResponse({
    res,
    message: "Media reordered successfully",
    data: result,
  });
});
