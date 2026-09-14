import { prisma } from "../../config/prisma.js";

const variantMediaSelect = {
  id: true,
  url: true,
  isPrimary: true,
  sortOrder: true,
};

const productInclude = {
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
};

const variantInclude = {
  media: {
    select: variantMediaSelect,
  },
  product: {
    include: productInclude,
  },
};

const cartInclude = {
  items: {
    include: {
      variant: {
        include: variantInclude,
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
    where: {
      id: cartId,
    },
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
        include: variantInclude,
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
        include: variantInclude,
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
        include: variantInclude,
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
        include: variantInclude,
      },
    },
  });
};

export const findActiveCartBySessionId = async (sessionId) => {
  return prisma.cart.findFirst({
    where: {
      sessionId,
      status: "ACTIVE",
    },
    include: cartInclude,
  });
};

export const mergeGuestCartIntoUserCart = async ({
  guestCartId,
  userCartId,
  items,
}) => {
  return prisma.$transaction(async (tx) => {
    for (const item of items) {
      const existingItem = await tx.cartItem.findUnique({
        where: {
          cartId_variantId: {
            cartId: userCartId,
            variantId: item.variantId,
          },
        },
      });

      if (existingItem) {
        await tx.cartItem.update({
          where: {
            cartId_variantId: {
              cartId: userCartId,
              variantId: item.variantId,
            },
          },
          data: {
            quantity: existingItem.quantity + item.quantity,
          },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: userCartId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPriceSnapshot: item.unitPriceSnapshot,
          },
        });
      }
    }

    await tx.cart.delete({
      where: {
        id: guestCartId,
      },
    });
  });
};

export const deleteCartById = async (cartId) => {
  return prisma.cart.delete({
    where: {
      id: cartId,
    },
  });
};

export const clearCartItems = async (cartId) => {
  return prisma.cartItem.deleteMany({
    where: {
      cartId,
    },
  });
};

export const getCartItemsWithDetails = async (cartId) => {
  return prisma.cartItem.findMany({
    where: {
      cartId,
    },
    include: {
      variant: {
        include: variantInclude,
      },
    },
  });
};

export const updateCartStatus = async (cartId, status) => {
  return prisma.cart.update({
    where: {
      id: cartId,
    },
    data: {
      status,
    },
    include: cartInclude,
  });
};

export const deleteCartsByUserId = async (userId) => {
  return prisma.cart.deleteMany({
    where: {
      userId,
    },
  });
};
