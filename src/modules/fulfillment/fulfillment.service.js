import { prisma } from "../../config/prisma.js";

import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";

import * as auditService from "../audit/audit.service.js";
import * as fulfillmentDb from "./fulfillment.db.js";
import * as warehouseDb from "../warehouse/warehouse.db.js";
import * as orderDb from "../order/order.db.js";

import { orderSplitter } from "./order.splitter.js";

// ============================================================
// FULFILLMENT STATE MACHINE
// ============================================================

const FULFILLMENT_TRANSITIONS = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const assertValidFulfillmentTransition = (currentStatus, nextStatus) => {
  const allowed = FULFILLMENT_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    throw new BadRequestError(
      `Invalid fulfillment status transition: ${currentStatus} → ${nextStatus}`,
    );
  }
};

// ============================================================
// GET
// ============================================================

export const getFulfillments = async (query = {}) => {
  return fulfillmentDb.findFulfillments(query);
};

export const getFulfillmentById = async (id) => {
  const fulfillment = await fulfillmentDb.findFulfillmentById(id);

  if (!fulfillment) {
    throw new NotFoundError("Fulfillment not found");
  }

  return fulfillment;
};

export const getFulfillmentsByOrder = async (orderId) => {
  return fulfillmentDb.findFulfillmentsByOrderId(orderId);
};

// ============================================================
// PREPARE FULFILLMENT PLAN
// ============================================================

export const prepareFulfillmentPlan = async (fulfillmentGroups = {}) => {
  const plan = [];

  for (const [type, items] of Object.entries(fulfillmentGroups)) {
    if (!items || items.length === 0) {
      continue;
    }

    let warehouse = null;

    if (type !== "DIGITAL") {
      warehouse = await warehouseDb.findActiveWarehouseByType(type);

      if (!warehouse) {
        throw new BadRequestError(
          `No active warehouse configured for fulfillment type: ${type}`,
        );
      }
    }

    plan.push({
      type,

      warehouseId: warehouse?.id || null,

      items: items.map((item) => ({
        variantId: item.variantId,

        quantity: Number(item.quantity),

        unitPrice: item.unitPriceSnapshot ?? item.unitPrice ?? 0,
      })),
    });
  }

  return plan;
};

// ============================================================
// GENERATE FULFILLMENTS FOR ORDER
// ============================================================

export const generateFulfillmentsForOrder = async (
  orderId,
) => {
  const order = await orderDb.findOrderById(
    orderId,
  );

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  if (!order.items?.length) {
    throw new BadRequestError(
      "Cannot generate fulfillments for an order with no items",
    );
  }

  const existingFulfillments =
    await fulfillmentDb.findFulfillmentsByOrderId(
      orderId,
    );

  if (existingFulfillments.length > 0) {
    throw new BadRequestError(
      "Fulfillments have already been generated for this order",
    );
  }

  const groups =
    orderSplitter.splitOrderByFulfillment(
      order.items,
    );

  const fulfillmentPlan =
    await prepareFulfillmentPlan(groups);

  return prisma.$transaction(
    async (tx) => {
      return createFulfillmentsForOrder({
        orderId,
        fulfillmentPlan,
        tx,
      });
    },
  );
};

// ============================================================
// CREATE FULFILLMENTS
// ============================================================

export const createFulfillmentsForOrder = async ({
  orderId,
  fulfillmentPlan = [],
  tx = prisma,
}) => {
  if (!orderId) {
    throw new BadRequestError("Order ID is required");
  }

  if (!Array.isArray(fulfillmentPlan)) {
    throw new BadRequestError("Invalid fulfillment plan");
  }

  const createdFulfillments = [];

  for (const group of fulfillmentPlan) {
    if (!group.items?.length) {
      continue;
    }

    const fulfillment = await fulfillmentDb.createFulfillment(
      {
        orderId,

        type: group.type,

        warehouseId: group.warehouseId || null,

        status: "PENDING",

        items: {
          create: group.items.map((item) => ({
            variantId: item.variantId,

            quantity: item.quantity,

            unitPrice: item.unitPrice,
          })),
        },
      },
      tx,
    );

    createdFulfillments.push(fulfillment);
  }

  return createdFulfillments;
};

// ============================================================
// STATUS
// ============================================================

export const updateFulfillmentStatus = async (
  id,
  nextStatus,
  actorId = null,
) => {
  return prisma.$transaction(async (tx) => {
    const fulfillment = await fulfillmentDb.findFulfillmentById(id, tx);

    if (!fulfillment) {
      throw new NotFoundError("Fulfillment not found");
    }

    assertValidFulfillmentTransition(fulfillment.status, nextStatus);

    const updated = await fulfillmentDb.updateFulfillmentStatus(
      id,
      nextStatus,
      tx,
    );

    await updateOrderStatusFromFulfillments(fulfillment.orderId, tx);

    if (actorId) {
      await auditService.logAudit(
        {
          userId: actorId,
          action: "FULFILLMENT_STATUS_UPDATED",
          entity: "FULFILLMENT",
          entityId: id,

          metadata: {
            from: fulfillment.status,
            to: nextStatus,
            orderId: fulfillment.orderId,
          },
        },
        tx,
      );
    }

    return updated;
  });
};

// ============================================================
// TRACKING
// ============================================================

export const updateFulfillmentTracking = async (id, data) => {
  const fulfillment = await fulfillmentDb.findFulfillmentById(id);

  if (!fulfillment) {
    throw new NotFoundError("Fulfillment not found");
  }

  if (["DELIVERED", "CANCELLED"].includes(fulfillment.status)) {
    throw new BadRequestError(
      `Cannot update tracking for a ${fulfillment.status.toLowerCase()} fulfillment`,
    );
  }

  return fulfillmentDb.updateFulfillmentTracking(id, data);
};

// ============================================================
// ORDER STATUS AGGREGATION
// ============================================================

const getAggregateOrderStatus = (fulfillments) => {
  if (!fulfillments.length) {
    return null;
  }

  const activeFulfillments = fulfillments.filter(
    (fulfillment) => fulfillment.status !== "CANCELLED",
  );

  if (activeFulfillments.length === 0) {
    return "CANCELLED";
  }

  const statuses = activeFulfillments.map((fulfillment) => fulfillment.status);

  if (statuses.every((status) => status === "DELIVERED")) {
    return "DELIVERED";
  }

  if (statuses.some((status) => status === "SHIPPED")) {
    return "SHIPPED";
  }

  if (statuses.some((status) => status === "PROCESSING")) {
    return "PROCESSING";
  }

  return null;
};

const updateOrderStatusFromFulfillments = async (orderId, tx) => {
  const order = await orderDb.findOrderById(orderId, tx);

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  const fulfillments = await fulfillmentDb.findFulfillmentsByOrderId(
    orderId,
    tx,
  );

  const aggregateStatus = getAggregateOrderStatus(fulfillments);

  if (!aggregateStatus) {
    return order;
  }

  const currentStatus = order.status;

  const validTransitions = {
    PENDING: ["CONFIRMED", "CANCELLED"],

    CONFIRMED: ["PROCESSING", "CANCELLED"],

    PROCESSING: ["SHIPPED", "CANCELLED"],

    SHIPPED: ["DELIVERED", "CANCELLED"],

    DELIVERED: ["COMPLETED"],

    COMPLETED: [],

    CANCELLED: [],
  };

  const allowed = validTransitions[currentStatus] || [];

  if (aggregateStatus === "CANCELLED" && allowed.includes("CANCELLED")) {
    return orderDb.updateOrderStatusTx(orderId, "CANCELLED", tx);
  }

  if (aggregateStatus === "PROCESSING" && allowed.includes("PROCESSING")) {
    return orderDb.updateOrderStatusTx(orderId, "PROCESSING", tx);
  }

  if (aggregateStatus === "SHIPPED" && allowed.includes("SHIPPED")) {
    return orderDb.updateOrderStatusTx(orderId, "SHIPPED", tx);
  }

  if (aggregateStatus === "DELIVERED" && allowed.includes("DELIVERED")) {
    return orderDb.updateOrderStatusTx(orderId, "DELIVERED", tx);
  }

  return order;
};

// ============================================================
// DELETE
// ============================================================

export const deleteFulfillment = async (id) => {
  return prisma.$transaction(async (tx) => {
    const fulfillment = await fulfillmentDb.findFulfillmentById(id, tx);

    if (!fulfillment) {
      throw new NotFoundError("Fulfillment not found");
    }

    if (fulfillment.status !== "PENDING") {
      throw new BadRequestError("Only pending fulfillments can be deleted");
    }

    return fulfillmentDb.deleteFulfillment(id, tx);
  });
};
