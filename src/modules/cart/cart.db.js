import { prisma } from "../../config/prisma.js";

// ============================================================
// DATABASE CLIENT
// ============================================================

const dbClient = (tx) => tx || prisma;

// ============================================================
// SHARED SELECTS
// ============================================================

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

// ============================================================
// CART FINDERS
// ============================================================

export const findActiveCartByUserId = async (userId, tx) => {
  return dbClient(tx).cart.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: cartInclude,
  });
};

export const findCartById = async (cartId, tx) => {
  return dbClient(tx).cart.findUnique({
    where: {
      id: cartId,
    },
    include: cartInclude,
  });
};

export const findActiveCartBySessionId = async (sessionId, tx) => {
  return dbClient(tx).cart.findFirst({
    where: {
      sessionId,
      status: "ACTIVE",
    },
    include: cartInclude,
  });
};

// ============================================================
// CART CREATION
// ============================================================

export const createCart = async (userId, tx) => {
  return dbClient(tx).cart.create({
    data: {
      userId,
      status: "ACTIVE",
    },
    include: cartInclude,
  });
};

// ============================================================
// CART ITEMS
// ============================================================

export const findCartItem = async ({ cartId, variantId }, tx) => {
  return dbClient(tx).cartItem.findUnique({
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

export const createCartItem = async (
  { cartId, variantId, quantity, unitPriceSnapshot },
  tx,
) => {
  return dbClient(tx).cartItem.create({
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

export const updateCartItemQuantity = async (
  { cartId, variantId, quantity },
  tx,
) => {
  return dbClient(tx).cartItem.update({
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

export const deleteCartItem = async ({ cartId, variantId }, tx) => {
  return dbClient(tx).cartItem.delete({
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

export const getCartItemsWithDetails = async (cartId, tx) => {
  return dbClient(tx).cartItem.findMany({
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

export const clearCartItems = async (cartId, tx) => {
  return dbClient(tx).cartItem.deleteMany({
    where: {
      cartId,
    },
  });
};

// ============================================================
// CART STATUS
// ============================================================

export const updateCartStatus = async (cartId, status, tx) => {
  return dbClient(tx).cart.update({
    where: {
      id: cartId,
    },
    data: {
      status,
    },
    include: cartInclude,
  });
};

export const markCartAsCheckedOut = async (cartId, tx) => {
  return dbClient(tx).cart.update({
    where: {
      id: cartId,
    },
    data: {
      status: "CHECKED_OUT",
    },
    include: cartInclude,
  });
};

// ============================================================
// GUEST CART MERGE
// ============================================================

export const mergeGuestCartIntoUserCart = async (
  { guestCartId, userCartId, items },
  tx,
) => {
  const client = dbClient(tx);

  for (const item of items) {
    const existingItem = await client.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: userCartId,
          variantId: item.variantId,
        },
      },
    });

    if (existingItem) {
      await client.cartItem.update({
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
      await client.cartItem.create({
        data: {
          cartId: userCartId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPriceSnapshot: item.unitPriceSnapshot,
        },
      });
    }
  }

  await client.cart.delete({
    where: {
      id: guestCartId,
    },
  });
};

// ============================================================
// CART DELETION
// ============================================================

export const deleteCartById = async (cartId, tx) => {
  return dbClient(tx).cart.delete({
    where: {
      id: cartId,
    },
  });
};

export const deleteCartsByUserId = async (userId, tx) => {
  return dbClient(tx).cart.deleteMany({
    where: {
      userId,
    },
  });
};
