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
  cartItems: true,
  orderItems: true,
  wishlists: true,
  reviews: true,
};

export const createVariant = (data) => {
  return prisma.productVariant.create({
    data,
    include: variantInclude,
  });
};

export const bulkCreateVariants = (variantsData) => {
  return prisma.$transaction(
    variantsData.map((data) =>
      prisma.productVariant.create({
        data,
        include: variantInclude,
      }),
    ),
  );
};

export const findVariantById = (id) => {
  return prisma.productVariant.findUnique({
    where: { id },
    include: variantInclude,
  });
};

export const findVariantBySKU = (sku) => {
  return prisma.productVariant.findUnique({
    where: { sku },
    include: variantInclude,
  });
};

export const findVariantsByProduct = (productId, filters = {}) => {
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

  return prisma.productVariant.findMany({
    where,
    include: variantInclude,
    orderBy: { createdAt: "desc" },
  });
};

export const updateVariant = (id, data) => {
  return prisma.productVariant.update({
    where: { id },
    data,
    include: variantInclude,
  });
};

export const deleteVariant = (id) => {
  return prisma.productVariant.delete({
    where: { id },
    include: variantInclude,
  });
};

export const updateVariantStock = (id, quantity) => {
  return prisma.productVariant.update({
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
