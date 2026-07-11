// modules/orders/order.service.js
import { prisma } from "../../config/prisma.js";
import { NotFoundError, BadRequestError } from "../../classes/errorClasses.js";
import * as checkoutService from "../checkout/checkout.service.js";
import { assertValidTransition } from "./order.state.js";
import * as orderDb from "./order.db.js";
import {
  getPaginationParams,
  formatPaginatedResponse,
} from "../../lib/pagination.js";
import { CBMCalculator } from "../shipping/cbm.calculator.js";

export const getMyOrders = async (userId, filters) => {
  const { page, limit, status, search, startDate, endDate } = filters;
  const { skip, take } = getPaginationParams(page, limit);

  const [data, total] = await orderDb.findOrders({
    userId,
    status,
    search,
    startDate,
    endDate,
    skip,
    take,
  });

  return formatPaginatedResponse({ data, total, page, limit });
};

export const getAllOrders = async (filters) => {
  const { page, limit, status, userId, search, startDate, endDate } = filters;
  const { skip, take } = getPaginationParams(page, limit);

  const [data, total] = await orderDb.findOrders({
    status,
    userId,
    search,
    startDate,
    endDate,
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

export const getOrderByOrderNumber = async (orderNumber, user) => {
  const order = await orderDb.findOrderByOrderNumber(orderNumber);

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

export const updateOrderStatus = async (id, status, userId) => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
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

    // STATE MACHINE ENFORCEMENT
    assertValidTransition(order.status, status);

    // If cancelling, restore stock
    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      for (const item of order.items) {
        await orderDb.restoreOrderItemStock(
          {
            variantId: item.variantId,
            quantity: item.quantity,
          },
          tx,
        );
      }
    }

    // Update order status
    const updatedOrder = await orderDb.updateOrderStatusTx(id, { status }, tx);

    // Log status change
    await orderDb.createAuditLog(
      {
        userId,
        action: "ORDER_STATUS_CHANGE",
        entity: "Order",
        entityId: id,
        metadata: {
          from: order.status,
          to: status,
        },
      },
      tx,
    );

    return updatedOrder;
  });
};

export const checkout = async ({ userId, payload }) => {
  return checkoutService.checkout({
    userId,
    payload,
  });
};

export const getOrderTimeline = async (orderId) => {
  const order = await orderDb.findOrderById(orderId);
  if (!order) {
    throw new NotFoundError("Order not found");
  }

  const timeline = [
    {
      status: "ORDER_CREATED",
      timestamp: order.createdAt,
      description: "Order created",
    },
  ];

  // Get status changes from audit logs
  const auditLogs = await orderDb.findOrderAuditLogs(orderId);
  for (const log of auditLogs) {
    const metadata = log.metadata || {};
    timeline.push({
      status: metadata.to || "STATUS_CHANGED",
      timestamp: log.createdAt,
      description: `Order status changed from ${metadata.from} to ${metadata.to}`,
      metadata: log.metadata,
    });
  }

  // Get payment events
  const payments = await orderDb.findOrderPayments(orderId);
  for (const payment of payments) {
    timeline.push({
      status: `PAYMENT_${payment.status}`,
      timestamp: payment.createdAt,
      description: `Payment ${payment.status.toLowerCase()}: ${payment.reference}`,
      metadata: {
        amount: payment.amount,
        provider: payment.provider,
        reference: payment.reference,
      },
    });
  }

  // Get fulfillment events
  const fulfillments = await orderDb.findOrderFulfillments(orderId);
  for (const fulfillment of fulfillments) {
    timeline.push({
      status: `FULFILLMENT_${fulfillment.status}`,
      timestamp: fulfillment.createdAt,
      description: `Fulfillment ${fulfillment.status.toLowerCase()}: ${fulfillment.type}`,
      metadata: {
        type: fulfillment.type,
        trackingNumber: fulfillment.trackingNumber,
        carrier: fulfillment.carrier,
      },
    });
  }

  return timeline;
};

export const updateOrderCBM = async (orderId, cbmData, adminUserId) => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    // Validate CBM data
    if (!cbmData.totalCBM || cbmData.totalCBM <= 0) {
      throw new BadRequestError("Invalid CBM data");
    }

    // Update order with CBM
    const updatedOrder = await orderDb.updateOrderCBM(
      orderId,
      {
        ...cbmData,
        updatedBy: adminUserId,
        updatedAt: new Date(),
      },
      tx,
    );

    // Log CBM update
    await orderDb.createAuditLog(
      {
        userId: adminUserId,
        action: "ORDER_CBM_UPDATE",
        entity: "Order",
        entityId: orderId,
        metadata: {
          previousCBM: order.cbm,
          newCBM: cbmData.totalCBM,
          data: cbmData,
        },
      },
      tx,
    );

    return updatedOrder;
  });
};

export const getOrderMetrics = async () => {
  return orderDb.getOrderMetrics();
};

export const getOrdersByFulfillmentType = async (fulfillmentType) => {
  return orderDb.findOrdersByFulfillmentType(fulfillmentType);
};

/**
 * Calculate CBM for cart items (helper function)
 */
export const calculateCartCBM = (cart) => {
  if (!cart || !cart.items) return [];

  return cart.items.map((cartItem) => {
    const variant = cartItem.variant;
    let itemCBM = 0;
    let chargeableWeight = 0;

    if (variant?.length && variant?.width && variant?.height) {
      // Calculate CBM
      const lengthM = Number(variant.length) / 100;
      const widthM = Number(variant.width) / 100;
      const heightM = Number(variant.height) / 100;
      itemCBM = lengthM * widthM * heightM * cartItem.quantity;

      // Calculate chargeable weight
      const actualWeight =
        Number(variant.actualWeight || 0) * cartItem.quantity;
      const volumetricWeight = itemCBM * 1000; // 1 CBM = 1000 kg for sea freight
      chargeableWeight = Math.max(actualWeight, volumetricWeight);
    }

    return {
      ...cartItem,
      cbm: parseFloat(itemCBM.toFixed(4)),
      chargeableWeight: parseFloat(chargeableWeight.toFixed(2)),
    };
  });
};
