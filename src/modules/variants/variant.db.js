// modules/variants/variant.db.js
import { prisma } from "../../config/prisma.js";

// ============================================================================
// CLIENT RESOLVER
// ============================================================================
//
// Callers frequently pass `tx = null` (see variant.service.js) meaning
// "no active transaction, use the global client". Default parameters
// only fire on `undefined`, not `null`, so every function resolves the
// client explicitly instead of relying on a default value.

const db = (tx) => tx ?? prisma;

// ============================================================================
// SHARED INCLUDES
// ============================================================================
//
// Narrowed from the previous version. cartItems / orderItems / reviews
// were pulled on every read and write, making every variant operation
// several times more expensive than necessary. Callers that need those
// relations should use a dedicated accessor (add one when needed)
// rather than paying for them unconditionally.

const variantInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      categoryId: true,
      brand: { select: { id: true, name: true, slug: true } },
      category: { select: { id: true, name: true, slug: true } },
      collection: { select: { id: true, name: true, slug: true } },
    },
  },
  media: { orderBy: { sortOrder: "asc" } },
};

const variantWriteInclude = {
  media: { orderBy: { sortOrder: "asc" } },
};

// ============================================================================
// CRUD
// ============================================================================

export const createVariant = (data, tx = null) =>
  db(tx).productVariant.create({ data, include: variantInclude });

export const createVariantWithMedia = async (
  variantData,
  mediaData = [],
  tx = null,
) =>
  db(tx).productVariant.create({
    data: {
      ...variantData,
      media: {
        create: mediaData.map((image, index) => ({
          url: image.url,
          publicId: image.publicId,
          mimeType: image.mimeType,
          bytes: image.bytes,
          format: image.format,
          width: image.width,
          height: image.height,
          isPrimary: index === 0,
          sortOrder: index,
        })),
      },
    },
    include: variantWriteInclude,
  });

export const bulkCreateVariants = async (variantsData, tx = null) => {
  const client = db(tx);

  return client.$transaction(
    variantsData.map((data) => {
      const { variantImages = [], ...variantData } = data;
      return client.productVariant.create({
        data: {
          ...variantData,
          media:
            variantImages.length > 0
              ? {
                  create: variantImages.map((image, index) => ({
                    url: image.url,
                    publicId: image.publicId,
                    mimeType: image.mimeType,
                    bytes: image.bytes,
                    format: image.format,
                    width: image.width,
                    height: image.height,
                    isPrimary: index === 0,
                    sortOrder: index,
                  })),
                }
              : undefined,
        },
        include: variantWriteInclude,
      });
    }),
  );
};

export const findVariantById = (id, tx = null) =>
  db(tx).productVariant.findUnique({
    where: { id },
    include: variantInclude,
  });

export const findVariantBySKU = (sku, tx = null) =>
  db(tx).productVariant.findUnique({
    where: { sku },
    include: variantInclude,
  });

export const findVariantsByProduct = (productId, filters = {}, tx = null) => {
  const { isActive, minPrice, maxPrice, fulfillmentType, shippingType } =
    filters;

  const where = {
    productId,
    ...(typeof isActive === "boolean" && { isActive }),
    ...(fulfillmentType && { fulfillmentType }),
    ...(shippingType && { shippingType }),
    ...(minPrice !== undefined && { price: { gte: minPrice } }),
    ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
  };

  return db(tx).productVariant.findMany({
    where,
    include: variantInclude,
    orderBy: { createdAt: "desc" },
  });
};

export const updateVariant = (id, data, tx = null) =>
  db(tx).productVariant.update({
    where: { id },
    data,
    include: variantWriteInclude,
  });

export const updateVariantMedia = async (id, mediaData = [], tx = null) => {
  const client = db(tx);

  await client.variantMedia.deleteMany({ where: { variantId: id } });

  return client.productVariant.update({
    where: { id },
    data: {
      media: {
        create: mediaData.map((image, index) => ({
          url: image.url,
          publicId: image.publicId,
          mimeType: image.mimeType,
          bytes: image.bytes,
          format: image.format,
          width: image.width,
          height: image.height,
          isPrimary: index === 0,
          sortOrder: index,
        })),
      },
    },
    include: variantWriteInclude,
  });
};

export const deleteVariant = (id, tx = null) =>
  db(tx).productVariant.delete({
    where: { id },
    include: variantWriteInclude,
  });

export const updateVariantStock = (id, quantity, tx = null) =>
  db(tx).productVariant.update({
    where: { id },
    data: { stock: quantity },
    include: variantWriteInclude,
  });

export const decrementVariantStock = (id, quantity, tx = null) =>
  db(tx).productVariant.updateMany({
    where: { id, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });

export const incrementVariantStock = (id, quantity, tx = null) =>
  db(tx).productVariant.update({
    where: { id },
    data: { stock: { increment: quantity } },
    include: variantWriteInclude,
  });

export const findVariantsByIds = (ids, tx = null) =>
  db(tx).productVariant.findMany({
    where: { id: { in: ids } },
    include: variantInclude,
  });

export const findVariantsBySKUs = (skus, tx = null) =>
  db(tx).productVariant.findMany({
    where: { sku: { in: skus } },
    include: variantInclude,
  });

export const updateVariantStatus = (id, isActive, tx = null) =>
  db(tx).productVariant.update({
    where: { id },
    data: { isActive },
    include: variantWriteInclude,
  });

export const bulkUpdateVariantStock = (updates, tx = null) => {
  const client = db(tx);

  return client.$transaction(
    updates.map(({ id, quantity }) =>
      client.productVariant.update({
        where: { id },
        data: { stock: quantity },
        include: variantWriteInclude,
      }),
    ),
  );
};

export const bulkDeleteVariants = (ids, tx = null) => {
  const client = db(tx);

  return client.$transaction(
    ids.map((id) =>
      client.productVariant.delete({
        where: { id },
        include: variantWriteInclude,
      }),
    ),
  );
};

export const getVariantWithStockCheck = (id, requiredQuantity, tx = null) =>
  db(tx).productVariant.findFirst({
    where: { id, stock: { gte: requiredQuantity }, isActive: true },
    include: variantInclude,
  });

export const findLowStockVariants = (threshold = 10, tx = null) =>
  db(tx).productVariant.findMany({
    where: { stock: { lte: threshold }, isActive: true },
    include: {
      product: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { stock: "asc" },
  });

export const getVariantMetrics = async (tx = null) => {
  const client = db(tx);

  const [total, active, outOfStock, lowStock] = await Promise.all([
    client.productVariant.count(),
    client.productVariant.count({ where: { isActive: true } }),
    client.productVariant.count({ where: { stock: 0, isActive: true } }),
    client.productVariant.count({
      where: { stock: { lte: 10, gt: 0 }, isActive: true },
    }),
  ]);

  return { total, active, outOfStock, lowStock };
};
