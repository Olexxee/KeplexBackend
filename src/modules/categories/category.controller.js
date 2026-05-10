import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as categoryService from "./category.service.js";

export const createCategory = asyncWrapper(async (req, res) => {
  const category = await categoryService.createCategory(req.body);

  return successResponse({
    res,
    statusCode: 201,
    message: "Category created successfully",
    data: category,
  });
});

export const getCategories = asyncWrapper(async (req, res) => {
  const categories = await categoryService.getCategories(req.query);

  return successResponse({
    res,
    message: "Categories fetched successfully",
    data: categories,
  });
});

export const updateCategory = asyncWrapper(async (req, res) => {
  const category = await categoryService.updateCategory(
    req.params.id,
    req.body,
  );

  return successResponse({
    res,
    message: "Category updated successfully",
    data: category,
  });
});

export const deleteCategory = asyncWrapper(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);

  return successResponse({
    res,
    message: "Category deleted successfully",
    data: null,
  });
});
