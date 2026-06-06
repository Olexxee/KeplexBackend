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
      category: true,
      media: true,
    },
  });
};

export const listTrainingPrograms = async (options = {}, tx = prisma) => {
  const { where, orderBy, take, include } = options;

  return tx.trainingProgram.findMany({
    where,
    orderBy: orderBy ?? { displayOrder: "asc" },
    take,
    include: include ?? {
      category: true,
      media: true,
    },
  });
};
