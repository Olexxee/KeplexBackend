import slugify from "slugify";
import * as trainingDb from "./trainingProgram.db.js";
import { NotFoundError, BadRequestError } from "../../classes/errorClasses.js";

export const createTrainingProgram = async (data) => {
  const slug = data.slug || slugify(data.title, { lower: true, strict: true });

  return trainingDb.createTrainingProgram({
    title: data.title,
    slug,
    shortDescription: data.shortDescription,
    description: data.description,
    imageUrl: data.imageUrl,
    price: data.price,
    featured: data.featured ?? false,
    active: data.active ?? true,
    displayOrder: data.displayOrder ?? 0,
    highlights: data.highlights ?? [],
  });
};

export const updateTrainingProgram = async (id, data) => {
  const existing = await trainingDb.findTrainingProgramById(id);
  if (!existing) throw new NotFoundError("Training program not found");
  return trainingDb.updateTrainingProgram(id, data);
};

export const deleteTrainingProgram = async (id) => {
  const existing = await trainingDb.findTrainingProgramById(id);
  if (!existing) throw new NotFoundError("Training program not found");
  return trainingDb.deleteTrainingProgram(id);
};

export const getTrainingProgramById = async (id) => {
  const program = await trainingDb.findTrainingProgramById(id);
  if (!program) throw new NotFoundError("Training program not found");
  return program;
};

export const getTrainingBySlug = async (slug) => {
  const program = await trainingDb.findTrainingProgramBySlug(slug);
  if (!program) throw new NotFoundError("Training program not found");
  return program;
};

// public — active only
export const getAllTrainingPrograms = async () => {
  return trainingDb.listTrainingPrograms({ where: { active: true } });
};

// admin — all regardless of status
export const getAdminTrainingPrograms = async () => {
  return trainingDb.listTrainingPrograms();
};

export const toggleTrainingStatus = async (id, active) => {
  const existing = await trainingDb.findTrainingProgramById(id);
  if (!existing) throw new NotFoundError("Training program not found");
  return trainingDb.updateTrainingProgram(id, { active });
};

export const toggleFeaturedTraining = async (id, featured) => {
  const existing = await trainingDb.findTrainingProgramById(id);
  if (!existing) throw new NotFoundError("Training program not found");
  return trainingDb.updateTrainingProgram(id, { featured });
};
