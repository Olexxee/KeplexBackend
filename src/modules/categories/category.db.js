import { prisma } from "../../config/prisma.js";

const categoryMediaSelect = {
  id: true,
  url: true,
  publicId: true,
  mimeType: true,
  width: true,
  height: true,
  bytes: true,
  format: true,
  alt: true,
  isPrimary: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
};

const categoryRelations = {
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

  media: {
    select: categoryMediaSelect,
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
  },

  _count: {
    select: {
      children: true,
      products: true,
    },
  },
};

export const createCategory = async (data) => {
  return prisma.category.create({
    data,
    include: categoryRelations,
  });
};

export const findCategoryById = async (id) => {
  return prisma.category.findUnique({
    where: { id },
  });
};

export const findCategoryBySlug = async (slug) => {
  return prisma.category.findUnique({
    where: { slug },
    include: categoryRelations,
  });
};

export const findCategories = async ({
  type,
  isActive,
  parentId,
  search,
  skip = 0,
  take = 20,
} = {}) => {
  const where = {
    ...(type && { type }),

    ...(typeof isActive === "boolean" && {
      isActive,
    }),

    ...(parentId !== undefined && {
      parentId: parentId || null,
    }),

    ...(search && {
      OR: [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    }),
  };

  const queryOptions = {
    where,

    include: categoryRelations,

    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],

    skip,
    take,
  };

  const [categories, total] = await Promise.all([
    prisma.category.findMany(queryOptions),
    prisma.category.count({ where }),
  ]);

  return {
    categories,
    total,
  };
};

export const updateCategory = async (id, data) => {
  return prisma.category.update({
    where: { id },
    data,
    include: categoryRelations,
  });
};

export const deleteCategory = async (id) => {
  return prisma.category.delete({
    where: { id },
  });
};

export const createCategoryMedia = async (categoryId, data) => {
  return prisma.categoryMedia.create({
    data: {
      categoryId,
      ...data,
    },
  });
};

export const findCategoryByIdWithRelations = async (id) => {
  return prisma.category.findUnique({
    where: { id },
    include: categoryRelations,
  });
};

export const clearPrimaryCategoryMedia = async (categoryId) => {
  return prisma.categoryMedia.updateMany({
    where: {
      categoryId,
      isPrimary: true,
    },
    data: {
      isPrimary: false,
    },
  });
};
