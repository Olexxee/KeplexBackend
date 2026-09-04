// modules/products/product.db.js

import { prisma } from "../../config/prisma.js";

// ============================================================================
// SHARED INCLUDES
// ============================================================================

const brandInclude = {
  select: {
    id: true,
    name: true,
    slug: true,
    media: {
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
    },
  },
};

const categoryInclude = {
  select: {
    id: true,
    name: true,
    slug: true,
    type: true,
  },
};

const categoryCardInclude = {
  select: {
    id: true,
    name: true,
    slug: true,
  },
};

const collectionInclude = {
  select: {
    id: true,
    name: true,
    slug: true,
  },
};

// ============================================================================
// VARIANT INCLUDES
// ============================================================================

const variantMediaInclude = {
  media: {
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
  },
};

const variantReviewsInclude = {
  reviews: {
    where: { status: "APPROVED" },
    select: {
      id: true,
      rating: true,
      comment: true,
      helpfulCount: true,
      createdAt: true,
      user: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  },
};

// ============================================================================
// PRODUCT DETAIL
// ============================================================================

const productDetailVariantsInclude = {
  where: { isActive: true },
  include: {
    ...variantMediaInclude,
    ...variantReviewsInclude,
  },
  orderBy: { createdAt: "asc" },
};

export const productDetailInclude = {
  brand: brandInclude,
  category: categoryInclude,
  collection: collectionInclude,
  variants: productDetailVariantsInclude,
  _count: {
    select: { variants: true },
  },
};

// ============================================================================
// PRODUCT CARD
// ============================================================================

const productCardVariantsInclude = {
  where: { isActive: true },
  take: 1,
  include: {
    ...variantMediaInclude,
    reviews: {
      where: { status: "APPROVED" },
      select: { rating: true },
    },
  },
  orderBy: { createdAt: "asc" },
};

export const productCardInclude = {
  brand: brandInclude,
  category: categoryCardInclude,
  collection: collectionInclude,
  variants: productCardVariantsInclude,
  _count: {
    select: { variants: true },
  },
};

// ============================================================================
// COMPUTED FIELDS
// ============================================================================

const getRatings = (product) =>
  product.variants?.flatMap((v) => v.reviews?.map((r) => r.rating) ?? []) ?? [];

const getAverageRating = (ratings) =>
  ratings.length
    ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
    : 0;

const getPriceRange = (variants = []) => {
  const prices = variants
    .map((v) => Number(v.price))
    .filter((p) => Number.isFinite(p));
  if (!prices.length) return { min: null, max: null };
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

const addComputedFields = (product) => {
  const ratings = getRatings(product);
  return {
    ...product,
    avgRating: getAverageRating(ratings),
    totalReviews: ratings.length,
    priceRange: getPriceRange(product.variants),
  };
};

// ============================================================================
// CRUD
// ============================================================================

export const createProduct = (data, tx = prisma) =>
  tx.product.create({ data, include: productDetailInclude });

export const findProductById = (id, tx = prisma) =>
  tx.product.findUnique({ where: { id }, include: productDetailInclude });

export const findProductBySlug = (slug, tx = prisma) =>
  tx.product.findUnique({ where: { slug }, include: productDetailInclude });

export const updateProduct = (id, data, tx = prisma) =>
  tx.product.update({ where: { id }, data, include: productDetailInclude });

export const updateProductStatus = (id, status, tx = prisma) =>
  tx.product.update({
    where: { id },
    data: { status },
    include: productDetailInclude,
  });

export const deleteProduct = (id, tx = prisma) =>
  tx.product.delete({ where: { id } });

// ============================================================================
// LISTS
// ============================================================================

export const findProducts = async (
  {
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
    skip = 0,
    take = 20,
    includeVariants = true,
  } = {},
  tx = prisma,
) => {
  const where = {
    ...(categoryId && { categoryId }),
    ...(brandId && { brandId }),
    ...(collectionId && { collectionId }),
    ...(status && { status }),
    ...(typeof isFeatured === "boolean" && { isFeatured }),
    ...(typeof isNew === "boolean" && { isNew }),
    ...(typeof isBestSeller === "boolean" && { isBestSeller }),
    ...((minPrice !== undefined || maxPrice !== undefined || search) && {
      variants: {
        some: {
          ...(minPrice !== undefined || maxPrice !== undefined
            ? {
                price: {
                  ...(minPrice !== undefined && { gte: minPrice }),
                  ...(maxPrice !== undefined && { lte: maxPrice }),
                },
              }
            : {}),
          ...(search ? { sku: { contains: search, mode: "insensitive" } } : {}),
        },
      },
    }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        {
          variants: {
            some: { sku: { contains: search, mode: "insensitive" } },
          },
        },
      ],
    }),
  };

  const orderBy = { [sortBy]: sortOrder };
  const include = includeVariants
    ? productCardInclude
    : {
        brand: brandInclude,
        category: categoryCardInclude,
        collection: collectionInclude,
        _count: { select: { variants: true } },
      };

  const [products, total] = await Promise.all([
    tx.product.findMany({ where, include, skip, take, orderBy }),
    tx.product.count({ where }),
  ]);

  return { products: products.map(addComputedFields), total };
};

// ============================================================================
// SPECIAL LISTS
// ============================================================================

export const findFeaturedProducts = (
  { limit = 10, categoryId } = {},
  tx = prisma,
) =>
  tx.product.findMany({
    where: {
      isFeatured: true,
      status: "ACTIVE",
      ...(categoryId && { categoryId }),
    },
    include: productCardInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

export const findNewArrivals = ({ limit = 10, categoryId } = {}, tx = prisma) =>
  tx.product.findMany({
    where: {
      isNew: true,
      status: "ACTIVE",
      ...(categoryId && { categoryId }),
    },
    include: productCardInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

export const findBestSellers = ({ limit = 10, categoryId } = {}, tx = prisma) =>
  tx.product.findMany({
    where: {
      isBestSeller: true,
      status: "ACTIVE",
      ...(categoryId && { categoryId }),
    },
    include: productCardInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

// ============================================================================
// RELATIONS
// ============================================================================

export const getProductVariants = (productId, tx = prisma) =>
  tx.productVariant.findMany({
    where: { productId },
    include: {
      product: { select: { id: true, name: true, slug: true } },
      ...variantMediaInclude,
      ...variantReviewsInclude,
    },
    orderBy: { createdAt: "asc" },
  });

export const getRelatedProducts = async (productId, limit = 6, tx = prisma) => {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { categoryId: true, brandId: true },
  });
  if (!product) return [];

  return tx.product.findMany({
    where: {
      id: { not: productId },
      status: "ACTIVE",
      OR: [
        { categoryId: product.categoryId },
        ...(product.brandId ? [{ brandId: product.brandId }] : []),
      ],
    },
    include: productCardInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};
