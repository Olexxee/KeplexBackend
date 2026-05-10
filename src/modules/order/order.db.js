import { prisma } from "../../config/prisma.js";

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

export const createOrderFromCart = async (
  { userId, payload, cart, totalAmount },
  tx = prisma,
) => {
  return tx.order.create({
    data: {
      userId,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail || null,
      customerPhone: payload.customerPhone,
      notes: payload.notes || null,
      totalAmount,
      status: "PENDING",
      items: {
        create: cart.items.map((cartItem) => {
          const unitPrice = cartItem.unitPriceSnapshot;
          const totalPrice = Number(unitPrice) * cartItem.quantity;

          return {
            itemId: cartItem.itemId,
            quantity: cartItem.quantity,
            unitPriceSnapshot: unitPrice,
            totalPrice,
          };
        }),
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
              images: true,
            },
          },
        },
      },
    },
  });
};

export const markCartAsCheckedOut = async (cartId, tx = prisma) => {
  return tx.cart.update({
    where: { id: cartId },
    data: { status: "CHECKED_OUT" },
  });
};

export const findOrders = async ({ status, userId } = {}) => {
  return prisma.order.findMany({
    where: {
      ...(status && { status }),
      ...(userId && { userId }),
    },
    include: {
      items: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
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
    orderBy: { createdAt: "desc" },
  });
};

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
              images: true,
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
  });
};

export const updateOrderStatus = async (id, status) => {
  return prisma.order.update({
    where: { id },
    data: { status },
    include: {
      items: true,
    },
  });
};

export const decrementItemStock = async ({ itemId, quantity }, tx = prisma) => {
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