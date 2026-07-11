// modules/variants/variant.db.js
import { prisma } from "../../config/prisma.js";

const variantInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      brand: true,
      category: true,
      collection: true,
    },
  },
  media: {
    orderBy: { sortOrder: "asc" },
  },
  cartItems: true,
  orderItems: true,
  wishlists: true,
  reviews: true,
};

export const createVariant = (data, tx = prisma) => {
  return tx.productVariant.create({
    data,
    include: variantInclude,
  });
};

export const createVariantWithMedia = async (
  variantData,
  mediaData = [],
  tx = prisma,
) => {
  return tx.productVariant.create({
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
    include: variantInclude,
  });
};

export const bulkCreateVariants = async (variantsData, tx = prisma) => {
  return tx.$transaction(
    variantsData.map((data) => {
      const { variantImages = [], ...variantData } = data;
      return tx.productVariant.create({
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
        include: variantInclude,
      });
    }),
  );
};

export const findVariantById = (id, tx = prisma) => {
  return tx.productVariant.findUnique({
    where: { id },
    include: variantInclude,
  });
};

export const findVariantBySKU = (sku, tx = prisma) => {
  return tx.productVariant.findUnique({
    where: { sku },
    include: variantInclude,
  });
};

export const findVariantsByProduct = (productId, filters = {}, tx = prisma) => {
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

  return tx.productVariant.findMany({
    where,
    include: variantInclude,
    orderBy: { createdAt: "desc" },
  });
};

export const updateVariant = (id, data, tx = prisma) => {
  return tx.productVariant.update({
    where: { id },
    data,
    include: variantInclude,
  });
};

export const updateVariantMedia = async (id, mediaData = [], tx = prisma) => {
  return tx.$transaction(async (tx) => {
    // Delete existing media
    await tx.variantMedia.deleteMany({
      where: { variantId: id },
    });

    // Create new media
    return tx.productVariant.update({
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
      include: variantInclude,
    });
  });
};

export const deleteVariant = (id, tx = prisma) => {
  return tx.productVariant.delete({
    where: { id },
    include: variantInclude,
  });
};

export const updateVariantStock = (id, quantity, tx = prisma) => {
  return tx.productVariant.update({
    where: { id },
    data: { stock: quantity },
    include: variantInclude,
  });
};

export const decrementVariantStock = (id, quantity, tx = prisma) => {
  return tx.productVariant.updateMany({
    where: {
      id,
      stock: { gte: quantity },
    },
    data: {
      stock: { decrement: quantity },
    },
  });
};

export const incrementVariantStock = (id, quantity, tx = prisma) => {
  return tx.productVariant.update({
    where: { id },
    data: {
      stock: { increment: quantity },
    },
    include: variantInclude,
  });
};

export const findVariantsByIds = (ids, tx = prisma) => {
  return tx.productVariant.findMany({
    where: {
      id: { in: ids },
    },
    include: variantInclude,
  });
};

export const findVariantsBySKUs = (skus, tx = prisma) => {
  return tx.productVariant.findMany({
    where: {
      sku: { in: skus },
    },
    include: variantInclude,
  });
};

export const updateVariantStatus = (id, isActive, tx = prisma) => {
  return tx.productVariant.update({
    where: { id },
    data: { isActive },
    include: variantInclude,
  });
};

export const bulkUpdateVariantStock = (updates, tx = prisma) => {
  return tx.$transaction(
    updates.map(({ id, quantity }) =>
      tx.productVariant.update({
        where: { id },
        data: { stock: quantity },
        include: variantInclude,
      }),
    ),
  );
};

export const bulkDeleteVariants = (ids, tx = prisma) => {
  return tx.$transaction(
    ids.map((id) =>
      tx.productVariant.delete({
        where: { id },
        include: variantInclude,
      }),
    ),
  );
};

export const getVariantWithStockCheck = (id, requiredQuantity, tx = prisma) => {
  return tx.productVariant.findFirst({
    where: {
      id,
      stock: { gte: requiredQuantity },
      isActive: true,
    },
    include: variantInclude,
  });
};

export const findLowStockVariants = (threshold = 10, tx = prisma) => {
  return tx.productVariant.findMany({
    where: {
      stock: { lte: threshold },
      isActive: true,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { stock: "asc" },
  });
};

export const getVariantMetrics = async (tx = prisma) => {
  const [total, active, outOfStock, lowStock] = await Promise.all([
    tx.productVariant.count(),
    tx.productVariant.count({ where: { isActive: true } }),
    tx.productVariant.count({ where: { stock: 0, isActive: true } }),
    tx.productVariant.count({
      where: { stock: { lte: 10, gt: 0 }, isActive: true },
    }),
  ]);

  return {
    total,
    active,
    outOfStock,
    lowStock,
  };
};
