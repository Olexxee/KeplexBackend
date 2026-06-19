import { prisma } from "../../config/prisma.js";

export const findActiveCartByUserId = async (userId) => {
  return prisma.cart.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },

    select: {
      id: true,
      userId: true,
      status: true,
      createdAt: true,
      updatedAt: true,

      items: {
        select: {
          id: true,
          itemId: true,
          quantity: true,

          item: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              stock: true,
              status: true,

              media: {
                take: 1,
                select: {
                  id: true,
                  url: true,
                },
              },
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
