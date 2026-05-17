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

const normalizePayload = (payload) => ({
  ...payload,
  description: payload.description || null,
  parentId: payload.parentId || null,
});

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
};

export const createCategory = async (payload) => {
  const data = normalizePayload(payload);

  const existingSlug = await categoryDb.findCategoryBySlug(data.slug);

  if (existingSlug) {
    throw new ConflictError("Category slug already exists");
  }

  await ensureParentCategoryIsValid(data.parentId);

  return categoryDb.createCategory(data);
};

export const getCategories = async (filters) => {
  const { page, limit, ...rest } = filters;

  const { skip, take } = getPaginationParams(page, limit);

 const { categories, total } = await categoryDb.findCategories({
   ...rest,
   skip,
   take,
 });

  return formatPaginatedResponse({ data: categories, total, page, limit });
};

export const updateCategory = async (id, payload) => {
  const category = await categoryDb.findCategoryById(id);

  if (!category) {
    throw new NotFoundError("Category not found");
  }

  const data = normalizePayload(payload);

  if (data.slug && data.slug !== category.slug) {
    const existingSlug = await categoryDb.findCategoryBySlug(data.slug);

    if (existingSlug && existingSlug.id !== id) {
      throw new ConflictError("Category slug already exists");
    }
  }

  await ensureParentCategoryIsValid(data.parentId, id);

  return categoryDb.updateCategory(id, data);
};

export const deleteCategory = async (id) => {
  const category = await categoryDb.findCategoryById(id);

  if (!category) {
    throw new NotFoundError("Category not found");
  }

  return categoryDb.deleteCategory(id);
};
