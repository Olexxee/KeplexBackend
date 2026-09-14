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

// The client sends different kinds of ids depending on whether the
// product has variants: products with variants send the *variant's* id
// (that's what's selectable), products with no variants have nothing to
// select so they send the *product's* id directly. Wishlist storage is
// product-scoped either way (see wishlist.db.js / the userId_productId
// unique constraint), so every mutation/check resolves the incoming id
// to a product here, trying the variant table first, then falling back
// to treating it as a product id.
const resolveProduct = async (id) => {
  if (!id) {
    throw new BadRequestError("productId is required");
  }

  const variant = await productDb.findVariantById(id);
  if (variant) {
    const product = await productDb.findProductRefById(variant.productId);
    if (!product) {
      throw new NotFoundError("Product not found");
    }
    return product;
  }

  const product = await productDb.findProductRefById(id);
  if (product) {
    return product;
  }

  throw new NotFoundError("Product not found");
};

export const addToWishlist = async (userId, payload) => {
  // NOTE: payload.productId may actually be a variant id — see
  // resolveProduct above.
  const { productId: id } = payload;

  const product = await resolveProduct(id);

  if (product.status !== "ACTIVE") {
    throw new BadRequestError("Product is not available");
  }

  const existing = await wishlistDb.findWishlistItem(userId, product.id);
  if (existing) {
    throw new ConflictError("Item already in wishlist");
  }

  return wishlistDb.addToWishlist(userId, product.id);
};

export const removeFromWishlist = async (userId, id) => {
  const product = await resolveProduct(id);

  const item = await wishlistDb.findWishlistItem(userId, product.id);
  if (!item) {
    throw new NotFoundError("Item not found in wishlist");
  }

  return wishlistDb.removeFromWishlist(userId, product.id);
};

export const clearWishlist = async (userId) => {
  return wishlistDb.clearWishlist(userId);
};

export const checkInWishlist = async (userId, id) => {
  // A bad/unresolvable id just means "not wishlisted" for status checks —
  // no need to error the UI over it.
  try {
    const product = await resolveProduct(id);
    return wishlistDb.isInWishlist(userId, product.id);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof BadRequestError) {
      return false;
    }
    throw err;
  }
};

export const getWishlistProductIds = async (userId) => {
  return wishlistDb.getWishlistProductIds(userId);
};

export const batchCheckWishlist = async (userId, ids) => {
  if (!userId || !ids || ids.length === 0) {
    return {};
  }

  const [variants, products, wishlistedProductIds] = await Promise.all([
    productDb.findVariantsByIds(ids),
    productDb.findProductsByIds(ids),
    wishlistDb.getWishlistProductIds(userId),
  ]);

  const productIdByVariantId = new Map(
    variants.map((v) => [v.id, v.productId]),
  );
  const productIdSet = new Set(products.map((p) => p.id));
  const wishlistedProductIdSet = new Set(wishlistedProductIds);

  const result = {};
  for (const id of ids) {
    const productId =
      productIdByVariantId.get(id) ?? (productIdSet.has(id) ? id : null);
    result[id] = productId ? wishlistedProductIdSet.has(productId) : false;
  }
  return result;
};
