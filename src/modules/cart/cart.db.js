// modules/cart/cart.db.js
import { prisma } from "../../config/prisma.js";

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              brand: {
                select: {
                  id: true,
                  name: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  },
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
};

export const findActiveCartByUserId = async (userId) => {
  return prisma.cart.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: cartInclude,
  });
};

export const findCartById = async (cartId) => {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: cartInclude,
  });
};

export const createCart = async (userId) => {
  return prisma.cart.create({
    data: {
      userId,
      status: "ACTIVE",
    },
    include: cartInclude,
  });
};

export const findCartItem = async ({ cartId, variantId }) => {
  return prisma.cartItem.findUnique({
    where: {
      cartId_variantId: {
        cartId,
        variantId,
      },
    },
    include: {
      variant: {
        include: {
          product: true,
        },
      },
    },
  });
};

export const createCartItem = async ({
  cartId,
  variantId,
  quantity,
  unitPriceSnapshot,
}) => {
  return prisma.cartItem.create({
    data: {
      cartId,
      variantId,
      quantity,
      unitPriceSnapshot,
    },
    include: {
      variant: {
        include: {
          product: true,
        },
      },
    },
  });
};

export const updateCartItemQuantity = async ({
  cartId,
  variantId,
  quantity,
}) => {
  return prisma.cartItem.update({
    where: {
      cartId_variantId: {
        cartId,
        variantId,
      },
    },
    data: {
      quantity,
    },
    include: {
      variant: {
        include: {
          product: true,
        },
      },
    },
  });
};

export const deleteCartItem = async ({ cartId, variantId }) => {
  return prisma.cartItem.delete({
    where: {
      cartId_variantId: {
        cartId,
        variantId,
      },
    },
    include: {
      variant: {
        include: {
          product: true,
        },
      },
    },
  });
};

export const clearCartItems = async (cartId) => {
  return prisma.cartItem.deleteMany({
    where: { cartId },
  });
};

export const getCartItemsWithDetails = async (cartId) => {
  return prisma.cartItem.findMany({
    where: { cartId },
    include: {
      variant: {
        include: {
          product: {
            include: {
              brand: {
                select: {
                  id: true,
                  name: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
};

export const updateCartStatus = async (cartId, status) => {
  return prisma.cart.update({
    where: { id: cartId },
    data: { status },
    include: cartInclude,
  });
};

export const deleteCartsByUserId = async (userId) => {
  return prisma.cart.deleteMany({
    where: { userId },
  });
};
