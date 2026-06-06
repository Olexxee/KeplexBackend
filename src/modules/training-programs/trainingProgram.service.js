import * as trainingDb from "./trainingProgram.db.js";
import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";

export const createTrainingProgram = async (data) => {
  if (!data.title || !data.price) {
    throw new BadRequestError("Title and price are required");
  }

  return trainingDb.createTrainingProgram({
    ...data,
  });
};

export const updateTrainingProgram = async (id, data) => {
  const existing = await trainingDb.findTrainingProgramById(id);

  if (!existing) {
    throw new NotFoundError("Training program not found");
  }

  return trainingDb.updateTrainingProgram(id, data);
};

export const deleteTrainingProgram = async (id) => {
  const existing = await trainingDb.findTrainingProgramById(id);

  if (!existing) {
    throw new NotFoundError("Training program not found");
  }

  return trainingDb.deleteTrainingProgram(id);
};

export const getTrainingProgramById = async (id) => {
  const program = await trainingDb.findTrainingProgramById(id);

  if (!program) {
    throw new NotFoundError("Training program not found");
  }

  return program;
};

export const getAllTrainingPrograms = async () => {
  return trainingDb.listTrainingPrograms();
};
