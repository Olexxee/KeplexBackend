import { prisma } from "../../config/prisma.js";
import { NotFoundError, BadRequestError } from "../../classes/errorClasses.js";
import * as checkoutService from "../checkout/checkout.service.js";
import { assertValidTransition } from "./order.state.js";
import * as orderDb from "./order.db.js";
import {
  getPaginationParams,
  formatPaginatedResponse,
} from "../../lib/pagination.js";

export const getMyOrders = async (userId, filters) => {
  const { page, limit, status } = filters;

  const { skip, take } = getPaginationParams(page, limit);

  const [data, total] = await orderDb.findOrders({
    userId,
    status,
    skip,
    take,
  });

  return formatPaginatedResponse({ data, total, page, limit });
};

export const getAllOrders = async (filters) => {
  const { page, limit, status, userId } = filters;

  const { skip, take } = getPaginationParams(page, limit);

  const [data, total] = await orderDb.findOrders({
    status,
    userId,
    skip,
    take,
  });

  return formatPaginatedResponse({ data, total, page, limit });
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
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    // HARD IMMUTABILITY RULES
    if (order.status === "COMPLETED") {
      throw new BadRequestError("Completed orders are immutable");
    }

    if (order.status === "CANCELLED") {
      throw new BadRequestError("Cancelled orders are immutable");
    }

    // STATE MACHINE ENFORCEMENT (NEW)
    assertValidTransition(order.status, status);

    return orderDb.updateOrderStatusTx(id, { status }, tx);
  });
};

export const checkout = async ({ userId, payload }) => {
  return checkoutService.checkout({
    userId,
    payload,
  });
};
