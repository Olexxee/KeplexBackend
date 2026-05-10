import { prisma } from "../../config/prisma.js";

export const findFirstOrganisation = async () => {
  return prisma.organisation.findFirst({
    orderBy: { createdAt: "asc" },
  });
};

export const findOrganisationBySlug = async (slug) => {
  return prisma.organisation.findUnique({
    where: { slug },
  });
};

export const createOrganisation = async (data) => {
  return prisma.organisation.create({ data });
};

export const updateOrganisation = async (id, data) => {
  return prisma.organisation.update({
    where: { id },
    data,
  });
};
