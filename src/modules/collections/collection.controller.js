// modules/collections/collection.controller.js
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as collectionService from "./collection.service.js";

export const createCollection = asyncWrapper(async (req, res) => {
  const collection = await collectionService.createCollection(req.body);

  return successResponse({
    res,
    statusCode: 201,
    message: "Collection created successfully",
    data: collection,
  });
});

export const getCollections = asyncWrapper(async (req, res) => {
  const result = await collectionService.getCollections(req.query);

  return successResponse({
    res,
    message: "Collections fetched successfully",
    data: result.collections,
    meta: result.meta,
  });
});

export const getCollectionById = asyncWrapper(async (req, res) => {
  const collection = await collectionService.getCollectionById(req.params.id);

  return successResponse({
    res,
    message: "Collection fetched successfully",
    data: collection,
  });
});

export const getCollectionBySlug = asyncWrapper(async (req, res) => {
  const collection = await collectionService.getCollectionBySlug(
    req.params.slug,
  );

  return successResponse({
    res,
    message: "Collection fetched successfully",
    data: collection,
  });
});

export const updateCollection = asyncWrapper(async (req, res) => {
  const collection = await collectionService.updateCollection(
    req.params.id,
    req.body,
  );

  return successResponse({
    res,
    message: "Collection updated successfully",
    data: collection,
  });
});

export const deleteCollection = asyncWrapper(async (req, res) => {
  await collectionService.deleteCollection(req.params.id);

  return successResponse({
    res,
    message: "Collection deleted successfully",
    data: null,
  });
});
