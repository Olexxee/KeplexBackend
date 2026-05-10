import { prisma } from "../../config/prisma.js";

export const createCategory = async (data) => {
  return prisma.category.create({ data });
};

export const findCategoryById = async (id) => {
  return prisma.category.findUnique({
    where: { id },
  });
};

export const findCategoryBySlug = async (slug) => {
  return prisma.category.findUnique({
    where: { slug },
  });
};

export const findCategories = async ({ type, isActive } = {}) => {
  return prisma.category.findMany({
    where: {
      ...(type && { type }),
      ...(typeof isActive === "boolean" && { isActive }),
    },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      children: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          isActive: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
};

export const updateCategory = async (id, data) => {
  return prisma.category.update({
    where: { id },
    data,
  });
};

export const deleteCategory = async (id) => {
  return prisma.category.delete({
    where: { id },
  });
};
