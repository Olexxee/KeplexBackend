import { prisma } from "../../config/prisma.js";

const wishlistInclude = {
  variant: {
    include: {
      product: {
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      media: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  },
};

export const findWishlistByUser = async (userId, { skip = 0, take = 20 } = {}) => {
  const where = { userId };

  const [items, total] = await Promise.all([
    prisma.wishlist.findMany({
      where,
      include: wishlistInclude,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.wishlist.count({ where }),
  ]);

  return { items, total };
};

export const findWishlistItem = async (userId, variantId) => {
  return prisma.wishlist.findUnique({
    where: {
      userId_variantId: {
        userId,
        variantId,
      },
    },
    include: wishlistInclude,
  });
};

export const addToWishlist = async (userId, variantId) => {
  return prisma.wishlist.create({
    data: {
      userId,
      variantId,
    },
    include: wishlistInclude,
  });
};

export const removeFromWishlist = async (userId, variantId) => {
  return prisma.wishlist.delete({
    where: {
      userId_variantId: {
        userId,
        variantId,
      },
    },
  });
};

export const clearWishlist = async (userId) => {
  return prisma.wishlist.deleteMany({
    where: { userId },
  });
};

export const isInWishlist = async (userId, variantId) => {
  const item = await prisma.wishlist.findUnique({
    where: {
      userId_variantId: {
        userId,
        variantId,
      },
    },
    select: { id: true },
  });
  return !!item;
};

export const getWishlistVariantIds = async (userId) => {
  const items = await prisma.wishlist.findMany({
    where: { userId },
    select: { variantId: true },
  });
  return items.map((item) => item.variantId);
};