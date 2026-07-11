import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from "../../classes/errorClasses.js";
import {
  getPaginationParams,
  buildPaginationMeta,
} from "../../lib/pagination.js";
import * as wishlistDb from "./wishlist.db.js";
import * as variantDb from "../variants/variant.db.js";

export const getWishlist = async (userId, filters) => {
  const { page = 1, limit = 20 } = filters;
  const { skip, take } = getPaginationParams(page, limit);

  const { items, total } = await wishlistDb.findWishlistByUser(userId, {
    skip,
    take,
  });

  return {
    data: items,
    meta: buildPaginationMeta({
      page,
      limit,
      total,
    }),
  };
};

export const addToWishlist = async (userId, payload) => {
  const { variantId } = payload;

  // Check if variant exists and is active
  const variant = await variantDb.findVariantById(variantId);
  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  if (!variant.isActive) {
    throw new BadRequestError("Variant is not available");
  }

  // Check if already in wishlist
  const existing = await wishlistDb.findWishlistItem(userId, variantId);
  if (existing) {
    throw new ConflictError("Item already in wishlist");
  }

  return wishlistDb.addToWishlist(userId, variantId);
};

export const removeFromWishlist = async (userId, variantId) => {
  const item = await wishlistDb.findWishlistItem(userId, variantId);
  if (!item) {
    throw new NotFoundError("Item not found in wishlist");
  }

  return wishlistDb.removeFromWishlist(userId, variantId);
};

export const clearWishlist = async (userId) => {
  return wishlistDb.clearWishlist(userId);
};

export const checkInWishlist = async (userId, variantId) => {
  return wishlistDb.isInWishlist(userId, variantId);
};

export const getWishlistVariantIds = async (userId) => {
  return wishlistDb.getWishlistVariantIds(userId);
};

export const batchCheckWishlist = async (userId, variantIds) => {
  if (!userId || !variantIds || variantIds.length === 0) {
    return {};
  }

  const inWishlist = await wishlistDb.getWishlistVariantIds(userId);
  const result = {};
  for (const variantId of variantIds) {
    result[variantId] = inWishlist.includes(variantId);
  }
  return result;
};
