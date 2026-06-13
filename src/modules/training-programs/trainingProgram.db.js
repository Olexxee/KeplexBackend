import { prisma } from "../../config/prisma.js";

export const createTrainingProgram = async (data, tx = prisma) => {
  return tx.trainingProgram.create({
    data,
  });
};

export const updateTrainingProgram = async (id, data, tx = prisma) => {
  return tx.trainingProgram.update({
    where: { id },
    data,
  });
};

export const deleteTrainingProgram = async (id, tx = prisma) => {
  return tx.trainingProgram.delete({
    where: { id },
  });
};

export const findTrainingProgramById = async (id, tx = prisma) => {
  return tx.trainingProgram.findUnique({
    where: { id },
    include: {
      media: true,
    },
  });
};

export const findTrainingProgramBySlug = async (slug, tx = prisma) => {
  return tx.trainingProgram.findUnique({
    where: { slug },
  });
};

export const listTrainingPrograms = async (options = {}, tx = prisma) => {
  const { where, skip, take, orderBy } = options;

  return tx.trainingProgram.findMany({
    where,
    skip,
    take,
    orderBy: orderBy ?? {
      displayOrder: "asc",
    },
  });
};
