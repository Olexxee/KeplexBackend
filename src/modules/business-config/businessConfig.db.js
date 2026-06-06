import { prisma } from "../../config/prisma.js";

export const findAllConfigs = async () => {
  return prisma.businessConfig.findMany();
};

export const findConfigByKey = async (key) => {
  return prisma.businessConfig.findUnique({
    where: { key },
  });
};

export const upsertConfig = async ({ key, value }) => {
  return prisma.businessConfig.upsert({
    where: { key },
    update: { value },
    create: {
      key,
      value,
    },
  });
};
