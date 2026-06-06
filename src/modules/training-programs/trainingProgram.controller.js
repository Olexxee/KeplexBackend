import * as trainingService from "./trainingProgram.service.js";
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";

// CREATE
export const createTraining = asyncWrapper(async (req, res) => {
  const result = await trainingService.createTrainingProgram(req.body);

  return successResponse({
    res,
    statusCode: 201,
    message: "Training program created",
    data: result,
  });
});

// UPDATE
export const updateTraining = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const result = await trainingService.updateTrainingProgram(id, req.body);

  return successResponse({
    res,
    statusCode: 200,
    message: "Training program updated",
    data: result,
  });
});

// DELETE
export const deleteTraining = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const result = await trainingService.deleteTrainingProgram(id);

  return successResponse({
    res,
    statusCode: 200,
    message: "Training program deleted",
    data: result,
  });
});

// GET BY ID
export const getTrainingById = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const result = await trainingService.getTrainingProgramById(id);

  return successResponse({
    res,
    statusCode: 200,
    message: "Training program retrieved",
    data: result,
  });
});

// GET ALL
export const getTrainings = asyncWrapper(async (_req, res) => {
  const result = await trainingService.getAllTrainingPrograms();

  return successResponse({
    res,
    statusCode: 200,
    message: "Training programs retrieved",
    data: result,
  });
});