import { prisma } from "../../config/prisma.js";
import * as orderDb from "../order/order.db.js";
import { BadRequestError } from "../../classes/errorClasses.js";

const toNumber = (v) => Number(v);

const validateCart = (cart) => {
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

const calculateTotal = (cart) =>
  cart.items.reduce(
    (sum, i) => sum + toNumber(i.unitPriceSnapshot) * i.quantity,
    0,
  );

// Accepts a single object — matches checkout.controller.js call signature
export const checkout = async ({ userId, payload }) => {
  return prisma.$transaction(async (tx) => {
    const cart = await orderDb.findActiveCartForCheckout(userId, tx);

    validateCart(cart);

    if (!payload.addressId) {
      throw new BadRequestError("Delivery address is required");
    }

    const address = await tx.address.findFirst({
      where: {
        id: payload.addressId,
        userId,
      },
    });

    if (!address) {
      throw new BadRequestError("Address not found");
    }

    const user = await tx.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        email: true,
      },
    });

    for (const cartItem of cart.items) {
      if (cartItem.item.itemType === "PRODUCT") {
        const result = await orderDb.decrementItemStock(
          {
            itemId: cartItem.itemId,
            quantity: cartItem.quantity,
          },
          tx,
        );

        if (result.count === 0) {
          throw new BadRequestError(
            `${cartItem.item.name} has insufficient stock`,
          );
        }
      }
    }

    const totalAmount = calculateTotal(cart);

    const order = await orderDb.createOrderFromCart(
      {
        userId,
        cart,
        totalAmount,
        notes: payload.notes,
        address,
        customerEmail: user?.email,
      },
      tx,
    );

    await orderDb.markCartAsCheckedOut(cart.id, tx);

    return order;
  });
};
