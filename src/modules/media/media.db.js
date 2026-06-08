import { prisma } from "../../config/prisma.js";

export const createMedia = async (data, tx = prisma) => {
  return tx.media.create({
    data,
  });
};

export const deleteMedia = async (id, tx = prisma) => {
  return tx.media.delete({
    where: { id },
  });
};

export const findMediaById = async (id, tx = prisma) => {
  return tx.media.findUnique({
    where: { id },
  });
};

export const listProgramMedia = async (trainingProgramId, tx = prisma) => {
  return tx.media.findMany({
    where: {
      trainingProgramId,
    },
    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        sortOrder: "asc",
      },
    ],
  });
};
