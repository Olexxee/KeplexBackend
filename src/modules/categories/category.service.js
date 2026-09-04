import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../classes/errorClasses.js";
import * as categoryDb from "./category.db.js";
import {
  getPaginationParams,
  formatPaginatedResponse,
} from "../../lib/pagination.js";



const normalizeCreatePayload = (payload) => ({
  name: payload.name,
  slug: payload.slug,
  description: payload.description || null,
  type: payload.type || "PRODUCT",
  parentId: payload.parentId || null,
  isActive: payload.isActive ?? true,
  sortOrder: payload.sortOrder ?? 0,
});

const normalizeUpdatePayload = (payload) => {
  const data = {};
  if ("name" in payload) {
    data.name = payload.name;
  }
  if ("slug" in payload) {
    data.slug = payload.slug;
  }
  if ("description" in payload) {
    data.description = payload.description || null;
  }
  if ("type" in payload) {
    data.type = payload.type;
  }
  if ("parentId" in payload) {
    data.parentId = payload.parentId || null;
  }
  if ("isActive" in payload) {
    data.isActive = payload.isActive;
  }
  if ("sortOrder" in payload) {
    data.sortOrder = payload.sortOrder;
  }
  return data;
};

const ensureParentCategoryIsValid = async (
  parentId,
  currentCategoryId = null,
) => {
  if (!parentId) return;
  if (currentCategoryId && parentId === currentCategoryId) {
    throw new BadRequestError("A category cannot be its own parent");
  }
  const parent = await categoryDb.findCategoryById(parentId);
  if (!parent) {
    throw new BadRequestError("Parent category does not exist");
  }
  if (parent.type !== "PRODUCT") {
    throw new BadRequestError(
      "A category can only have a PRODUCT category as its parent",
    );
  }
};

const ensureSlugIsAvailable = async (slug, categoryId = null) => {
  const existing = await categoryDb.findCategoryBySlug(slug);

  if (existing && existing.id !== categoryId) {
    throw new ConflictError("Category slug already exists");
  }
};

const normalizeCategoryResponse = (category) => {
  if (!category) return category;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    type: category.type,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    parentId: category.parentId,
    parent: category.parent ?? null,
    children: category.children ?? [],
    media: category.media ?? [],
    image:
      category.media?.find((media) => media.isPrimary) ??
      category.media?.[0] ??
      null,
    productCount: category._count?.products ?? 0,
    childCount: category._count?.children ?? 0,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
};

export const createCategory = async (payload, uploadedImage = null) => {
  const data = normalizeCreatePayload(payload);

  await ensureSlugIsAvailable(data.slug);

  await ensureParentCategoryIsValid(data.parentId);

  const category = await categoryDb.createCategory(data);

  if (uploadedImage) {
    await categoryDb.createCategoryMedia(category.id, {
      ...uploadedImage,
      alt: payload.alt || category.name,
      isPrimary: true,
      sortOrder: 0,
    });

    const updated = await categoryDb.findCategoryBySlug(category.slug);

    return normalizeCategoryResponse(updated);
  }

  return normalizeCategoryResponse(category);
};

export const getCategories = async (filters) => {
  const { page, limit, type, isActive, parentId, search } = filters;

  const { skip, take } = getPaginationParams(page, limit);

  const { categories, total } = await categoryDb.findCategories({
    type,
    isActive,
    parentId,
    search,
    skip,
    take,
  });

  const data = categories.map(normalizeCategoryResponse);

  return formatPaginatedResponse({
    data,
    total,
    page,
    limit,
  });
};

export const getCategoryBySlug = async (slug) => {
  const category = await categoryDb.findCategoryBySlug(slug);

  if (!category) {
    throw new NotFoundError("Category not found");
  }

  return normalizeCategoryResponse(category);
};

export const updateCategory = async (id, payload, uploadedImage = null) => {
  const category = await categoryDb.findCategoryById(id);

  if (!category) {
    throw new NotFoundError("Category not found");
  }

  const data = normalizeUpdatePayload(payload);

  if (data.slug && data.slug !== category.slug) {
    await ensureSlugIsAvailable(data.slug, id);
  }

  if ("parentId" in data) {
    await ensureParentCategoryIsValid(data.parentId, id);
  }

  if (Object.keys(data).length > 0) {
    await categoryDb.updateCategory(id, data);
  }

  if (uploadedImage) {
    await categoryDb.clearPrimaryCategoryMedia(id);

    await categoryDb.createCategoryMedia(id, {
      ...uploadedImage,
      alt: payload.alt || category.name,
      isPrimary: true,
      sortOrder: 0,
    });
  }

  const updated = await categoryDb.findCategoryBySlug(
    data.slug || category.slug,
  );

  return normalizeCategoryResponse(updated);
};

export const getCategoryById = async (id) => {
  const category = await categoryDb.findCategoryByIdWithRelations(id);

  if (!category) {
    throw new NotFoundError("Category not found");
  }

  return normalizeCategoryResponse(category);
};

export const deleteCategory = async (id) => {
  const category = await categoryDb.findCategoryById(id);

  if (!category) {
    throw new NotFoundError("Category not found");
  }

  return categoryDb.deleteCategory(id);
};
