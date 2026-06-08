import * as trainingService from "./trainingProgram.service.js";
import * as trainingMediaService from "./trainingProgramMedia.service.js";
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import { BadRequestError } from "../../classes/errorClasses.js";

export const createTraining = asyncWrapper(async (req, res) => {
  const result = await trainingService.createTrainingProgram(req.body);
  return successResponse({
    res,
    statusCode: 201,
    message: "Training program created",
    data: result,
  });
});

export const updateTraining = asyncWrapper(async (req, res) => {
  const result = await trainingService.updateTrainingProgram(
    req.params.id,
    req.body,
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

export const uploadProgramMedia = asyncWrapper(async (req, res) => {
  if (!req.uploadedFile) throw new BadRequestError("No image uploaded");
  const result = await trainingMediaService.uploadProgramMedia({
    trainingProgramId: req.params.id,
    file: req.uploadedFile,
  });
  return successResponse({
    res,
    statusCode: 201,
    message: "Media uploaded",
    data: result,
  });
});
