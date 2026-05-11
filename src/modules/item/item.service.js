import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../classes/errorClasses.js";
import { deleteFromCloudinary } from "../../config/cloudinaryService.js";
import * as itemDb from "./item.db.js";
import * as categoryDb from "../categories/category.db.js";
import { getPagination, buildPaginationMeta } from "../../lib/pagination.js";

export const getItems = async (filters) => {
  const pagination = getPagination(filters);

  const { items, total } = await itemDb.findItems({
    ...filters,
    ...pagination,
  });

  return {
    items,
    meta: buildPaginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total,
    }),
  };
};

const normalizePayload = (payload) => ({
  ...payload,
  description: payload.description || null,
  sku: payload.sku || null,
  compareAtPrice: payload.compareAtPrice ?? null,
  images: payload.images || null,
  metadata: payload.metadata || null,
});

const deleteUploadedImagesIfAny = async (images = []) => {
  if (Array.isArray(images) && images.length > 0) {
    await deleteFromCloudinary(images);
  }
};

const ensureCategoryExists = async (categoryId) => {
  if (!categoryId) return;

  const category = await categoryDb.findCategoryById(categoryId);

  if (!category) {
    throw new BadRequestError("Category does not exist");
  }

  if (!category.isActive) {
    throw new BadRequestError("Cannot assign item to inactive category");
  }
};

export const createItem = async (payload) => {
  const data = normalizePayload(payload);

  try {
    await ensureCategoryExists(data.categoryId);

    const existingSlug = await itemDb.findItemBySlug(data.slug);

    if (existingSlug) {
      throw new ConflictError("Item slug already exists");
    }

    if (data.sku) {
      const existingSku = await itemDb.findItemBySku(data.sku);

      if (existingSku) {
        throw new ConflictError("Item SKU already exists");
      }
    }

    return itemDb.createItem(data);
  } catch (error) {
    await deleteUploadedImagesIfAny(data.images);
    throw error;
  }
};

export const getItems = async (filters) => {
  const pagination = getPagination(filters);

  const { items, total } = await itemDb.findItems({
    ...filters,
    ...pagination,
  });

  return {
    items,
    meta: buildPaginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total,
    }),
  };
};

export const getItemById = async (id) => {
  const item = await itemDb.findItemById(id);

  if (!item) {
    throw new NotFoundError("Item not found");
  }

  return item;
};

export const updateItem = async (id, payload) => {
  const data = normalizePayload(payload);

  try {
    const item = await itemDb.findItemById(id);

    if (!item) {
      throw new NotFoundError("Item not found");
    }

    if (data.categoryId) {
      await ensureCategoryExists(data.categoryId);
    }

    if (data.slug && data.slug !== item.slug) {
      const existingSlug = await itemDb.findItemBySlug(data.slug);

      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictError("Item slug already exists");
      }
    }

    if (data.sku && data.sku !== item.sku) {
      const existingSku = await itemDb.findItemBySku(data.sku);

      if (existingSku && existingSku.id !== id) {
        throw new ConflictError("Item SKU already exists");
      }
    }

    const shouldReplaceImages =
      Array.isArray(data.images) && data.images.length > 0;

    const oldMedia = Array.isArray(item.media) ? item.media : [];

    const updatedItem = await itemDb.updateItem(id, data);

    if (shouldReplaceImages && oldMedia.length > 0) {
      await deleteFromCloudinary(oldMedia);
    }

    return updatedItem;
  } catch (error) {
    await deleteUploadedImagesIfAny(data.images);
    throw error;
  }
};

export const deleteItem = async (id) => {
  const item = await itemDb.findItemById(id);

  if (!item) {
    throw new NotFoundError("Item not found");
  }

  const media = Array.isArray(item.media) ? item.media : [];

  const deletedItem = await itemDb.deleteItem(id);

  if (media.length > 0) {
    await deleteFromCloudinary(media);
  }

  return deletedItem;
};