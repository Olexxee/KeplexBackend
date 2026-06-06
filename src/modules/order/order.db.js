import { prisma } from "../../config/prisma.js";

/**
 * CART
 */
export const findActiveCartForCheckout = async (userId, tx = prisma) => {
  return tx.cart.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      items: {
        include: {
          item: true,
        },
      },
    },
  });
};

/**
 * ORDER CREATE
 */
export const createOrderFromCart = async (
  { userId, payload, address, cart, totalAmount },
  tx = prisma,
) => {
  return tx.order.create({
    data: {
      userId,

      customerName: address.fullName,
      customerPhone: address.phone,

      shippingLabel: address.label,
      shippingStreet: address.addressLine,
      shippingCity: address.city,
      shippingState: address.state,
      shippingCountry: address.country,

      notes: payload.notes || null,

      totalAmount,

      status: "PENDING",

      items: {
        create: cart.items.map((cartItem) => ({
          itemId: cartItem.itemId,
          quantity: cartItem.quantity,
          unitPriceSnapshot: cartItem.unitPriceSnapshot,
          totalPrice: Number(cartItem.unitPriceSnapshot) * cartItem.quantity,
        })),
      },
    },

    include: {
      items: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
              slug: true,
              media: true,
            },
          },
        },
      },
    },
  });
};

/**
 * CART STATUS UPDATE
 */
export const markCartAsCheckedOut = async (cartId, tx = prisma) => {
  return tx.cart.update({
    where: { id: cartId },
    data: { status: "CHECKED_OUT" },
  });
};

/**
 * ORDERS LIST
 */
export const findOrders = async ({ status, userId, skip, take } = {}) => {
  const where = {
    ...(status && { status }),
    ...(userId && { userId }),
  };

  return Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take,
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                slug: true,
                media: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.order.count({ where }),
  ]);
};

/**
 * SINGLE ORDER
 */
export const findOrderById = async (id) => {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
              slug: true,
              media: true,
            },
          },
        },
      },

      payments: true,

      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  });
};

/**
 * ORDER STATUS
 */
export const updateOrderStatus = async (id, status) => {
  return prisma.order.update({
    where: { id },
    data: { status },
    include: {
      items: true,
    },
  });
};

/**
 * STOCK OPERATIONS
 */
export const decrementItemStock = async (
  { itemId, quantity },
  tx = prisma,
) => {
  return tx.item.updateMany({
    where: {
      id: itemId,
      stock: {
        gte: quantity,
      },
    },
    data: {
      stock: {
        decrement: quantity,
      },
    },
  });
};

export const restoreOrderItemStock = async (
  { itemId, quantity },
  tx = prisma,
) => {
  return tx.item.update({
    where: { id: itemId },
    data: {
      stock: {
        increment: quantity,
      },
    },
  });
};

/**
 * TRANSACTIONAL ORDER UPDATE
 */
export const updateOrderStatusTx = async (id, data, tx = prisma) => {
  return tx.order.update({
    where: { id },
    data,
    include: {
      items: {
        include: {
          item: true,
        },
      },
    },
  });
};