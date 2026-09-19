// modules/products/product.db.js
import { prisma } from "../../config/prisma.js";

// ============================================================================
// CLIENT RESOLVER
// ============================================================================

const db = (tx) => tx ?? prisma;

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
  select: { id: true, name: true, slug: true, type: true },
};

const categoryCardInclude = {
  select: { id: true, name: true, slug: true },
};

const collectionInclude = {
  select: { id: true, name: true, slug: true },
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
// PRODUCT INCLUDES
// ============================================================================

const productDetailVariantsInclude = {
  where: { isActive: true },
  include: {
    ...variantMediaInclude,
    ...variantReviewsInclude,
  },
  orderBy: { createdAt: "asc" },
};

const productAdminVariantsInclude = {
  include: {
    ...variantMediaInclude,
    ...variantReviewsInclude,
  },
  orderBy: { createdAt: "asc" },
  // No isActive filter — admin sees everything.
};

/**
 * Card include: full active variant list, minimal per-variant shape.
 * The `take: 1` that used to live here silently broke priceRange
 * (the mapper only saw one variant's price). Never re-add it.
 */
const productCardVariantsInclude = {
  where: { isActive: true },
  select: {
    id: true,
    color: true,
    size: true,
    price: true,
    compareAtPrice: true,
    stock: true,
    isActive: true,
    media: {
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
    },
    reviews: {
      where: { status: "APPROVED" },
      select: { rating: true },
    },
  },
  orderBy: { createdAt: "asc" },
};

export const productDetailInclude = {
  brand: brandInclude,
  category: categoryInclude,
  collection: collectionInclude,
  variants: productDetailVariantsInclude,
  _count: { select: { variants: true } },
};

export const productAdminInclude = {
  brand: brandInclude,
  category: categoryInclude,
  collection: collectionInclude,
  variants: productAdminVariantsInclude,
  _count: { select: { variants: true } },
};

export const productCardInclude = {
  brand: brandInclude,
  category: categoryCardInclude,
  collection: collectionInclude,
  variants: productCardVariantsInclude,
  _count: { select: { variants: true } },
};

// ============================================================================
// CRUD
// ============================================================================

export const createProduct = (data, tx = null) =>
  db(tx).product.create({ data, include: productDetailInclude });

export const findProductById = (id, tx = null) =>
  db(tx).product.findUnique({ where: { id }, include: productDetailInclude });

export const findProductBySlug = (slug, tx = null) =>
  db(tx).product.findUnique({ where: { slug }, include: productDetailInclude });

export const findProductByIdForAdmin = (id, tx = null) =>
  db(tx).product.findUnique({ where: { id }, include: productAdminInclude });

export const updateProduct = (id, data, tx = null) =>
  db(tx).product.update({ where: { id }, data, include: productDetailInclude });

export const updateProductStatus = (id, status, tx = null) =>
  db(tx).product.update({
    where: { id },
    data: { status },
    include: productDetailInclude,
  });

export const deleteProduct = (id, tx = null) =>
  db(tx).product.delete({ where: { id } });

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
  tx = null,
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

  const client = db(tx);

  const [products, total] = await Promise.all([
    client.product.findMany({ where, include, skip, take, orderBy }),
    client.product.count({ where }),
  ]);

  return { products, total };
};

// ============================================================================
// SPECIAL LISTS
// ============================================================================

export const findFeaturedProducts = (
  { limit = 10, categoryId } = {},
  tx = null,
) =>
  db(tx).product.findMany({
    where: {
      isFeatured: true,
      status: "ACTIVE",
      ...(categoryId && { categoryId }),
    },
    include: productCardInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

export const findNewArrivals = ({ limit = 10, categoryId } = {}, tx = null) =>
  db(tx).product.findMany({
    where: {
      isNew: true,
      status: "ACTIVE",
      ...(categoryId && { categoryId }),
    },
    include: productCardInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

export const findBestSellers = ({ limit = 10, categoryId } = {}, tx = null) =>
  db(tx).product.findMany({
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

export const getProductVariants = (productId, tx = null) =>
  db(tx).productVariant.findMany({
    where: { productId },
    include: {
      product: { select: { id: true, name: true, slug: true } },
      ...variantMediaInclude,
      ...variantReviewsInclude,
    },
    orderBy: { createdAt: "asc" },
  });

export const getRelatedProducts = async (productId, limit = 6, tx = null) => {
  const client = db(tx);

  const product = await client.product.findUnique({
    where: { id: productId },
    select: { categoryId: true, brandId: true },
  });

  if (!product) return [];

  return client.product.findMany({
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

// ============================================================================
// VARIANT LOOKUPS
// ============================================================================

export const findVariantById = (id, tx = null) =>
  db(tx).productVariant.findUnique({
    where: { id },
    select: { id: true, productId: true, isActive: true },
  });

export const findVariantsByIds = (ids, tx = null) =>
  db(tx).productVariant.findMany({
    where: { id: { in: ids } },
    select: { id: true, productId: true },
  });

// ============================================================================
// LIGHTWEIGHT LOOKUPS
// ============================================================================

/**
 * Minimal product projection for callers that only need identity +
 * category context (e.g. SKU generation). Avoids productDetailInclude.
 */
export const findProductBasicById = (id, tx = null) =>
  db(tx).product.findUnique({
    where: { id },
    select: { id: true, name: true, categoryId: true, status: true },
  });

/**
 * Scalar-only product update. Callers that re-read the hydrated product
 * after commit should use this instead of `updateProduct`, so the write
 * return value doesn't pay for the full include graph.
 */
export const updateProductScalars = (id, data, tx = null) =>
  db(tx).product.update({ where: { id }, data });

/**
 * All variants (active AND inactive) with just enough shape to match
 * incoming ids and collect Cloudinary publicIds for deletions.
 * `productDetailInclude` filters to active-only, so it cannot be used
 * for classification during updates.
 */
export const findProductVariantsForClassification = (productId, tx = null) =>
  db(tx).productVariant.findMany({
    where: { productId },
    select: {
      id: true,
      sku: true,
      isActive: true,
      media: { select: { publicId: true } },
      _count: {
        select: { orderItems: true, fulfillmentItems: true },
      },
    },
  });

// ============================================================================
// PRODUCT REFERENCE LOOKUPS
// ============================================================================

export const findProductRefById = (id, tx = null) =>
  db(tx).product.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

export const findProductsByIds = (ids, tx = null) =>
  db(tx).product.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true },
  });
