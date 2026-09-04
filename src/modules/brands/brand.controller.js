import { BadRequestError } from "../../classes/errorClasses.js";
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as brandService from "./brand.service.js";

export const createBrand = asyncWrapper(async (req, res) => {
  const brand = await brandService.createBrand(req.body, req.uploadedImage);

  return successResponse({
    res,
    statusCode: 201,
    message: "Brand created successfully",
    data: brand,
  });
});

export const getBrands = asyncWrapper(async (req, res) => {
  const result = await brandService.getBrands(req.query);

  return successResponse({
    res,
    message: "Brands fetched successfully",
    data: result.brands,
    meta: result.meta,
  });
});

export const getBrandById = asyncWrapper(async (req, res) => {
  const brand = await brandService.getBrandById(req.params.id);

  return successResponse({
    res,
    message: "Brand fetched successfully",
    data: brand,
  });
});

export const getBrandBySlug = asyncWrapper(async (req, res) => {
  const brand = await brandService.getBrandBySlug(req.params.slug);

  return successResponse({
    res,
    message: "Brand fetched successfully",
    data: brand,
  });
});

export const updateBrand = asyncWrapper(async (req, res) => {
  const brand = await brandService.updateBrand(
    req.params.id,
    req.body,
    req.uploadedImage,
  );

  return successResponse({
    res,
    message: "Brand updated successfully",
    data: brand,
  });
});

export const updateBrandLogo = asyncWrapper(async (req, res) => {
  if (!req.uploadedImage) {
    throw new BadRequestError("No logo image uploaded");
  }

  const brand = await brandService.updateBrandLogo(
    req.params.id,
    req.uploadedImage,
  );

  return successResponse({
    res,
    message: "Brand logo updated successfully",
    data: brand,
  });
});

export const deleteBrand = asyncWrapper(async (req, res) => {
  await brandService.deleteBrand(req.params.id);

  return successResponse({
    res,
    message: "Brand deleted successfully",
    data: null,
  });
});
