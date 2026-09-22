// src/modules/categories/category.db.js
import { prisma } from "../../config/prisma.js";

// ============================================================================
// SHARED SELECTS
// ============================================================================

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
    select: { id: true, name: true, slug: true },
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
    select: { children: true, products: true },
  },
};

// ============================================================================
// CRUD
// ============================================================================

export const createCategory = (data) =>
  prisma.category.create({ data, include: categoryRelations });

export const findCategoryById = (id) =>
  prisma.category.findUnique({ where: { id } });

export const findCategoryByIdWithRelations = (id) =>
  prisma.category.findUnique({ where: { id }, include: categoryRelations });

export const findCategoryBySlug = (slug) =>
  prisma.category.findUnique({ where: { slug }, include: categoryRelations });

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

    ...(typeof isActive === "boolean" && { isActive }),

    ...(parentId !== undefined && { parentId: parentId || null }),

    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      include: categoryRelations,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      skip,
      take,
    }),

    prisma.category.count({ where }),
  ]);

  return { categories, total };
};

export const updateCategory = (id, data) =>
  prisma.category.update({ where: { id }, data, include: categoryRelations });

export const deleteCategory = (id) => prisma.category.delete({ where: { id } });

// ============================================================================
// MEDIA
// ============================================================================

export const createCategoryMedia = (categoryId, data) =>
  prisma.categoryMedia.create({
    data: { categoryId, ...data },
  });

export const clearPrimaryCategoryMedia = (categoryId) =>
  prisma.categoryMedia.updateMany({
    where: { categoryId, isPrimary: true },
    data: { isPrimary: false },
  });

// ============================================================================
// RELATION COUNTS
// ============================================================================
//
// Used by the service layer to guard against deleting categories that are
// still referenced. `Product.categoryId` is a required relation without
// onDelete cascade, so deleting a category with products would otherwise
// raise Prisma P2003 (foreign key constraint failed).

export const countProductsInCategory = (categoryId) =>
  prisma.product.count({ where: { categoryId } });
