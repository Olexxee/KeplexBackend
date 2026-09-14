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
import * as productDb from "../products/product.db.js";

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
  const { productId } = payload;

  // Check if product exists and is active
  const product = await productDb.findProductById(productId);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  if (product.status !== "ACTIVE") {
    throw new BadRequestError("Product is not available");
  }

  // Check if already in wishlist
  const existing = await wishlistDb.findWishlistItem(userId, productId);
  if (existing) {
    throw new ConflictError("Item already in wishlist");
  }

  return wishlistDb.addToWishlist(userId, productId);
};

export const removeFromWishlist = async (userId, productId) => {
  const item = await wishlistDb.findWishlistItem(userId, productId);
  if (!item) {
    throw new NotFoundError("Item not found in wishlist");
  }

  return wishlistDb.removeFromWishlist(userId, productId);
};

export const clearWishlist = async (userId) => {
  return wishlistDb.clearWishlist(userId);
};

export const checkInWishlist = async (userId, productId) => {
  return wishlistDb.isInWishlist(userId, productId);
};

export const getWishlistProductIds = async (userId) => {
  return wishlistDb.getWishlistProductIds(userId);
};

export const batchCheckWishlist = async (userId, productIds) => {
  if (!userId || !productIds || productIds.length === 0) {
    return {};
  }

  const inWishlist = await wishlistDb.getWishlistProductIds(userId);
  const result = {};
  for (const productId of productIds) {
    result[productId] = inWishlist.includes(productId);
  }
  return result;
};
