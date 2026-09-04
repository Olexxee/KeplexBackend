import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as categoryService from "./category.service.js";


export const createCategory = asyncWrapper(async (req, res) => {
  const category = await categoryService.createCategory(
    req.body,
    req.uploadedImage,
  );

  return successResponse({
    res,
    statusCode: 201,
    message: "Category created successfully",
    data: category,
  });
});

export const getCategories = asyncWrapper(async (req, res) => {
  const result = await categoryService.getCategories(req.query);

  return successResponse({
    res,
    message: "Categories fetched successfully",
    data: result.data,
    meta: result.pagination,
  });
});

export const getCategoryById = asyncWrapper(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);

  return successResponse({
    res,
    message: "Category fetched successfully",
    data: category,
  });
});

export const getCategoryBySlug = asyncWrapper(async (req, res) => {
  const category = await categoryService.getCategoryBySlug(req.params.slug);

  return successResponse({
    res,
    message: "Category fetched successfully",
    data: category,
  });
});

export const updateCategory = asyncWrapper(async (req, res) => {
  const category = await categoryService.updateCategory(
    req.params.id,
    req.body,
    req.uploadedImage,
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
