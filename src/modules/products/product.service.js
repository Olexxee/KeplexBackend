import { NotFoundError } from "../../classes/errorClasses.js";
import {
  getPaginationParams,
  buildPaginationMeta,
} from "../../lib/pagination.js";
import * as productDb from "./product.db.js";

export const getProducts = async (filters) => {
  const {
    page = 1,
    limit = 20,
    categoryId,
    brandId,
    collectionId,
    status,
    isFeatured,
    isNew,
    isBestSeller,
    minPrice,
    maxPrice,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const { skip, take } = getPaginationParams(page, limit);

  const { products, total } = await productDb.findProducts({
    categoryId,
    brandId,
    collectionId,
    status,
    isFeatured,
    isNew,
    isBestSeller,
    minPrice,
    maxPrice,
    search,
    sortBy,
    sortOrder,
    skip,
    take,
    includeVariants: true,
  });

  return {
    products,
    meta: buildPaginationMeta({
      page,
      limit,
      total,
    }),
  };
};

export const getProductById = async (id) => {
  const product = await productDb.findProductById(id);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const allRatings =
    product.variants?.flatMap((v) => v.reviews?.map((r) => r.rating) || []) ||
    [];

  const avgRating =
    allRatings.length > 0
      ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
      : 0;

  const lowestPrice =
    product.variants?.length > 0
      ? Math.min(...product.variants.map((v) => Number(v.price)))
      : null;

  const highestPrice =
    product.variants?.length > 0
      ? Math.max(...product.variants.map((v) => Number(v.price)))
      : null;

  return {
    ...product,
    avgRating: parseFloat(avgRating.toFixed(1)),
    priceRange: {
      min: lowestPrice,
      max: highestPrice,
    },
    totalReviews: allRatings.length,
  };
};

export const getProductBySlug = async (slug) => {
  const product = await productDb.findProductBySlug(slug);
  if (!product) {
    throw new NotFoundError("Product not found");
  }
  return product;
};

export const getFeaturedProducts = async (filters) => {
  return productDb.findFeaturedProducts(filters);
};

export const getNewArrivals = async (filters) => {
  return productDb.findNewArrivals(filters);
};

export const getBestSellers = async (filters) => {
  return productDb.findBestSellers(filters);
};

export const getRelatedProducts = async (productId, limit) => {
  const product = await productDb.findProductById(productId);
  if (!product) {
    throw new NotFoundError("Product not found");
  }
  return productDb.getRelatedProducts(productId, limit);
};

export const getProductVariants = async (productId) => {
  const product = await productDb.findProductById(productId);
  if (!product) {
    throw new NotFoundError("Product not found");
  }
  return productDb.getProductVariants(productId);
};
