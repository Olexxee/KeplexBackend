import { prisma } from "../../config/prisma.js";
import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";
import * as orderDb from "./order.db.js";

const toNumber = (value) => Number(value);

const validateCartForCheckout = (cart) => {
  if (!cart) {
    throw new BadRequestError("Active cart not found");
  }

  if (!cart.items.length) {
    throw new BadRequestError("Cannot checkout an empty cart");
  }

  for (const cartItem of cart.items) {
    if (!cartItem.item) {
      throw new BadRequestError("One or more cart items are invalid");
    }

    if (cartItem.item.status !== "ACTIVE") {
      throw new BadRequestError(`${cartItem.item.name} is no longer available`);
    }

    if (
      cartItem.item.itemType === "PRODUCT" &&
      cartItem.item.stock < cartItem.quantity
    ) {
      throw new BadRequestError(`${cartItem.item.name} has insufficient stock`);
    }
  }
};

const calculateCartTotal = (cart) => {
  return cart.items.reduce((sum, cartItem) => {
    return sum + toNumber(cartItem.unitPriceSnapshot) * cartItem.quantity;
  }, 0);
};

export const checkout = async (userId, payload) => {
  return prisma.$transaction(async (tx) => {
    const cart = await orderDb.findActiveCartForCheckout(userId, tx);

    validateCartForCheckout(cart);

    for (const cartItem of cart.items) {
      if (cartItem.item.itemType === "PRODUCT") {
        const stockUpdate = await orderDb.decrementItemStock(
          {
            itemId: cartItem.itemId,
            quantity: cartItem.quantity,
          },
          tx,
        );

        if (stockUpdate.count === 0) {
          throw new BadRequestError(
            `${cartItem.item.name} has insufficient stock`,
          );
        }
      }
    }

    const totalAmount = calculateCartTotal(cart);

    const order = await orderDb.createOrderFromCart(
      {
        userId,
        payload,
        cart,
        totalAmount,
      },
      tx,
    );

    await orderDb.markCartAsCheckedOut(cart.id, tx);

    return order;
  });
};

export const getMyOrders = async (userId) => {
  return orderDb.findOrders({ userId });
};

export const getAllOrders = async (filters) => {
  return orderDb.findOrders(filters);
};

export const getOrderById = async (id, user) => {
  const order = await orderDb.findOrderById(id);

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  const isOwner = order.userId === user.id;
  const isAdmin = ["SUPER_ADMIN", "ADMIN", "STAFF"].includes(user.role);

  if (!isOwner && !isAdmin) {
    throw new NotFoundError("Order not found");
  }

  return order;
};

export const updateOrderStatus = async (id, status) => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.status === "COMPLETED" && status !== "COMPLETED") {
      throw new BadRequestError("Completed orders cannot be moved backwards");
    }

    if (order.status === "CANCELLED" && status !== "CANCELLED") {
      throw new BadRequestError("Cancelled orders cannot be changed");
    }

    const shouldRestoreStock = status === "CANCELLED" && !order.stockRestoredAt;

    if (shouldRestoreStock) {
      for (const orderItem of order.items) {
        if (orderItem.item.itemType === "PRODUCT") {
          await orderDb.restoreOrderItemStock(
            {
              itemId: orderItem.itemId,
              quantity: orderItem.quantity,
            },
            tx,
          );
        }
      }
    }

    return orderDb.updateOrderStatusTx(
      id,
      {
        status,
        ...(shouldRestoreStock && {
          stockRestoredAt: new Date(),
        }),
      },
      tx,
    );
  });
};
