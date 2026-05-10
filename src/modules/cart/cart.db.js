import { prisma } from "../../config/prisma.js";

export const findActiveCartByUserId = async (userId) => {
  return prisma.cart.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      items: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              stock: true,
              status: true,
              images: true,
            },
          },
        },
      },
    },
  });
};

export const createCart = async (userId) => {
  return prisma.cart.create({
    data: {
      userId,
      status: "ACTIVE",
    },
  });
};

export const findCartItem = async ({ cartId, itemId }) => {
  return prisma.cartItem.findUnique({
    where: {
      cartId_itemId: {
        cartId,
        itemId,
      },
    },
  });
};

export const createCartItem = async ({
  cartId,
  itemId,
  quantity,
  unitPriceSnapshot,
}) => {
  return prisma.cartItem.create({
    data: {
      cartId,
      itemId,
      quantity,
      unitPriceSnapshot,
    },
  });
};

export const updateCartItemQuantity = async ({ cartId, itemId, quantity }) => {
  return prisma.cartItem.update({
    where: {
      cartId_itemId: {
        cartId,
        itemId,
      },
    },
    data: {
      quantity,
    },
  });
};

export const deleteCartItem = async ({ cartId, itemId }) => {
  return prisma.cartItem.delete({
    where: {
      cartId_itemId: {
        cartId,
        itemId,
      },
    },
  });
};

export const clearCartItems = async (cartId) => {
  return prisma.cartItem.deleteMany({
    where: { cartId },
  });
};
