import { prisma } from "../../config/prisma.js";

// Product itself has no media of its own (images live on
// ProductVariant/VariantMedia), so we pull one representative active
// variant + its primary image along with the product, purely for
// rendering a wishlist card (thumbnail + a display price). This is not
// "the variant the user wishlisted" — there isn't one anymore; it's just
// a stand-in for display purposes.
const wishlistInclude = {
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
      variants: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        include: {
          media: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  },
};

export const findWishlistByUser = async (
  userId,
  { skip = 0, take = 20 } = {},
) => {
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

export const findWishlistItem = async (userId, productId) => {
  return prisma.wishlist.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    include: wishlistInclude,
  });
};

export const addToWishlist = async (userId, productId) => {
  return prisma.wishlist.create({
    data: {
      userId,
      productId,
    },
    include: wishlistInclude,
  });
};

export const removeFromWishlist = async (userId, productId) => {
  return prisma.wishlist.delete({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });
};

export const clearWishlist = async (userId) => {
  return prisma.wishlist.deleteMany({
    where: { userId },
  });
};

export const isInWishlist = async (userId, productId) => {
  const item = await prisma.wishlist.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    select: { id: true },
  });
  return !!item;
};

export const getWishlistProductIds = async (userId) => {
  const items = await prisma.wishlist.findMany({
    where: { userId },
    select: { productId: true },
  });
  return items.map((item) => item.productId);
};
