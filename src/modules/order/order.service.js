import { prisma } from "../../config/prisma.js";
import { NotFoundError, BadRequestError } from "../../classes/errorClasses.js";
import * as checkoutService from "../checkout/checkout.service.js";
import * as orderDb from "./order.db.js";
import * as auditDb from "../audit/audit.service.js";
import {
  assertValidTransition,
  isTerminalState,
  requiresStockRestore,
} from "./order.state.js";
import {
  getPaginationParams,
  formatPaginatedResponse,
} from "../../lib/pagination.js";

// ============================================================
// ORDERS
// ============================================================

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

  return formatPaginatedResponse({
    data,
    total,
    page,
    limit,
  });
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

  return formatPaginatedResponse({
    data,
    total,
    page,
    limit,
  });
};

// ============================================================
// SINGLE ORDER
// ============================================================

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

// ============================================================
// ORDER STATUS
// ============================================================

export const updateOrderStatus = async (id, status, userId) => {
  // Keep the transaction lean: every query inside it holds the connection
  // and counts against the timeout. Heavy reads (the full order include)
  // happen AFTER commit.
  await prisma.$transaction(
    async (tx) => {
      const order = await orderDb.findOrderForStatusChange(id, tx);

      if (!order) {
        throw new NotFoundError("Order not found");
      }

      // ----------------------------------------------------
      // TERMINAL STATES
      // ----------------------------------------------------

      if (isTerminalState(order.status)) {
        throw new BadRequestError(
          order.status === "COMPLETED"
            ? "Completed orders are immutable"
            : "Cancelled orders are immutable",
        );
      }

      // ----------------------------------------------------
      // STATE MACHINE
      // ----------------------------------------------------

      assertValidTransition(order.status, status);

      // ----------------------------------------------------
      // UPDATE (guarded against concurrent status changes)
      // ----------------------------------------------------

      const transitioned = await orderDb.transitionOrderStatus(
        id,
        order.status,
        status,
        tx,
      );

      if (!transitioned) {
        throw new BadRequestError(
          "Order status was changed by another request. Refresh and try again.",
        );
      }

      // ----------------------------------------------------
      // RESTORE STOCK ON CANCELLATION
      // ----------------------------------------------------

      if (requiresStockRestore(status)) {
        await orderDb.restoreStockForItems(order.items, tx);
      }

      // ----------------------------------------------------
      // AUDIT
      // ----------------------------------------------------

      await auditDb.logAudit(
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
    },
    {
      maxWait: 10_000,
      timeout: 20_000,
    },
  );

  // Full order payload, fetched outside the transaction
  return orderDb.findOrderById(id);
};

// ============================================================
// CHECKOUT
// ============================================================

export const checkout = async ({ userId, payload }) => {
  return checkoutService.checkout({
    userId,
    payload,
  });
};

// ============================================================
// ORDER TIMELINE
// ============================================================

export const getOrderTimeline = async (orderId, user) => {
  const order = await orderDb.findOrderById(orderId);

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  const isOwner = order.userId === user.id;

  const isAdmin = ["SUPER_ADMIN", "ADMIN", "STAFF"].includes(user.role);

  if (!isOwner && !isAdmin) {
    throw new NotFoundError("Order not found");
  }

  const timeline = [
    {
      status: "ORDER_CREATED",

      timestamp: order.createdAt,

      description: "Order created",
    },
  ];

  // ----------------------------------------------------------
  // STATUS EVENTS
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // PAYMENT EVENTS
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // FULFILLMENT EVENTS
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // SORT
  // ----------------------------------------------------------

  timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return timeline;
};

// ============================================================
// ORDER CBM UPDATE
// ============================================================

export const updateOrderCBM = async (orderId, cbmData, adminUserId) => {
  // ------------------------------------------------------
  // VALIDATION (no DB needed, so do it before opening a transaction)
  // ------------------------------------------------------

  const totalCBM = Number(cbmData?.totalCBM);

  const chargeableWeight = Number(
    cbmData?.totalChargeableWeight ?? cbmData?.chargeableWeight,
  );

  if (!Number.isFinite(totalCBM) || totalCBM < 0) {
    throw new BadRequestError("Invalid CBM data");
  }

  if (!Number.isFinite(chargeableWeight) || chargeableWeight < 0) {
    throw new BadRequestError("Invalid chargeable weight");
  }

  await prisma.$transaction(
    async (tx) => {
      const order = await orderDb.findOrderCBMSnapshot(orderId, tx);

      if (!order) {
        throw new NotFoundError("Order not found");
      }

      await orderDb.updateOrderCBM(
        orderId,
        {
          cbm: totalCBM,
          chargeableWeight,
          cbmData,
          cbmUpdatedAt: new Date(),
          cbmUpdatedBy: adminUserId,
        },
        tx,
      );

      await auditDb.createAuditLog(
        {
          userId: adminUserId,
          action: "ORDER_CBM_UPDATE",
          entity: "Order",
          entityId: orderId,
          metadata: {
            previousCBM: order.cbm,
            newCBM: totalCBM,
            previousChargeableWeight: order.chargeableWeight,
            newChargeableWeight: chargeableWeight,
            data: cbmData,
          },
        },
        tx,
      );
    },
    {
      maxWait: 10_000,
      timeout: 20_000,
    },
  );

  return orderDb.findOrderById(orderId);
};

// ============================================================
// METRICS
// ============================================================

export const getOrderMetrics = async () => {
  return orderDb.getOrderMetrics();
};

// ============================================================
// FULFILLMENT TYPE
// ============================================================

export const getOrdersByFulfillmentType = async (fulfillmentType) => {
  return orderDb.findOrdersByFulfillmentType(fulfillmentType);
};
