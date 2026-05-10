import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as itemService from "./item.service.js";

export const createItem = asyncWrapper(async (req, res) => {
  const item = await itemService.createItem(req.body);

  return successResponse({
    res,
    statusCode: 201,
    message: "Item created successfully",
    data: item,
  });
});

export const getItems = asyncWrapper(async (req, res) => {
  const items = await itemService.getItems(req.query);

  return successResponse({
    res,
    message: "Items fetched successfully",
    data: items,
  });
});

export const getItemById = asyncWrapper(async (req, res) => {
  const item = await itemService.getItemById(req.params.id);

  return successResponse({
    res,
    message: "Item fetched successfully",
    data: item,
  });
});

export const updateItem = asyncWrapper(async (req, res) => {
  const item = await itemService.updateItem(req.params.id, req.body);

  return successResponse({
    res,
    message: "Item updated successfully",
    data: item,
  });
});

export const deleteItem = asyncWrapper(async (req, res) => {
  await itemService.deleteItem(req.params.id);

  return successResponse({
    res,
    message: "Item deleted successfully",
    data: null,
  });
});
