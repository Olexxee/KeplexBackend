// modules/collections/collection.service.js
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../classes/errorClasses.js";
import {
  getPaginationParams,
  buildPaginationMeta,
} from "../../lib/pagination.js";
import * as collectionDb from "./collection.db.js";

export const createCollection = async (payload) => {
  const existingSlug = await collectionDb.findCollectionBySlug(payload.slug);
  if (existingSlug) {
    throw new ConflictError("Collection slug already exists");
  }

  return collectionDb.createCollection(payload);
};

export const getCollections = async (filters) => {
  const { page = 1, limit = 20, isActive, search } = filters;
  const { skip, take } = getPaginationParams(page, limit);

  const [collections, total] = await collectionDb.findCollections({
    isActive,
    search,
    skip,
    take,
  });

  return {
    collections,
    meta: buildPaginationMeta({
      page,
      limit,
      total,
    }),
  };
};

export const getCollectionById = async (id) => {
  const collection = await collectionDb.findCollectionById(id);
  if (!collection) {
    throw new NotFoundError("Collection not found");
  }
  return collection;
};

export const getCollectionBySlug = async (slug) => {
  const collection = await collectionDb.findCollectionBySlug(slug);
  if (!collection) {
    throw new NotFoundError("Collection not found");
  }
  return collection;
};

export const updateCollection = async (id, payload) => {
  const collection = await collectionDb.findCollectionById(id);
  if (!collection) {
    throw new NotFoundError("Collection not found");
  }

  if (payload.slug && payload.slug !== collection.slug) {
    const existingSlug = await collectionDb.findCollectionBySlug(payload.slug);
    if (existingSlug && existingSlug.id !== id) {
      throw new ConflictError("Collection slug already exists");
    }
  }

  return collectionDb.updateCollection(id, payload);
};

export const deleteCollection = async (id) => {
  const collection = await collectionDb.findCollectionById(id);
  if (!collection) {
    throw new NotFoundError("Collection not found");
  }

  if (collection.products && collection.products.length > 0) {
    throw new BadRequestError(
      "Cannot delete collection with existing products. Remove products first.",
    );
  }

  return collectionDb.deleteCollection(id);
};
