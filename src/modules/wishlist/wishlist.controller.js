// modules/wishlist/wishlist.controller.js
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as wishlistService from "./wishlist.service.js";

export const getWishlist = asyncWrapper(async (req, res) => {
  const result = await wishlistService.getWishlist(req.user.id, req.query);

  return successResponse({
    res,
    message: "Wishlist fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const addToWishlist = asyncWrapper(async (req, res) => {
  const item = await wishlistService.addToWishlist(req.user.id, req.body);

  return successResponse({
    res,
    statusCode: 201,
    message: "Item added to wishlist",
    data: item,
  });
});

export const removeFromWishlist = asyncWrapper(async (req, res) => {
  await wishlistService.removeFromWishlist(req.user.id, req.params.variantId);

  return successResponse({
    res,
    message: "Item removed from wishlist",
    data: null,
  });
});

export const clearWishlist = asyncWrapper(async (req, res) => {
  await wishlistService.clearWishlist(req.user.id);

  return successResponse({
    res,
    message: "Wishlist cleared successfully",
    data: null,
  });
});

export const checkInWishlist = asyncWrapper(async (req, res) => {
  const inWishlist = await wishlistService.checkInWishlist(
    req.user.id,
    req.params.variantId,
  );

  return successResponse({
    res,
    message: "Wishlist status fetched",
    data: { inWishlist },
  });
});

export const batchCheckWishlist = asyncWrapper(async (req, res) => {
  const { variantIds } = req.body;
  const results = await wishlistService.batchCheckWishlist(
    req.user.id,
    variantIds,
  );

  return successResponse({
    res,
    message: "Wishlist statuses fetched",
    data: results,
  });
});
