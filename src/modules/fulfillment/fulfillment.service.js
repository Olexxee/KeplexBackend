import { prisma } from "../../config/prisma.js";
import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";

import * as auditService from "../audit/audit.service.js";
import * as fulfillmentDb from "./fulfillment.db.js";
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

/**
 * Pure preparation phase.
 *
 * No transaction is opened here.
 *
 * Warehouse lookups happen before checkout's critical
 * transaction so they cannot consume transaction time.
 */
export const prepareFulfillmentPlan = async (fulfillmentGroups = {}) => {
  const plan = [];

  for (const [type, items] of Object.entries(fulfillmentGroups)) {
    if (!items || items.length === 0) {
      continue;
    }

    const warehouse = await orderSplitter.assignWarehouse(type);

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
// CREATE FULFILLMENTS
// ============================================================

/**
 * Persists a previously prepared fulfillment plan.
 *
 * This function is intentionally transaction-only.
 *
 * It does not:
 * - load the order
 * - query warehouses
 * - split the order
 * - perform shipping calculations
 *
 * Those operations belong to the preparation phase.
 */
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

// ============================================================
// WAREHOUSES
// ============================================================

export const getWarehouses = async (query = {}) => {
  return fulfillmentDb.findWarehouses(query);
};

export const getWarehouseById = async (id) => {
  const warehouse = await fulfillmentDb.findWarehouseById(id);

  if (!warehouse) {
    throw new NotFoundError("Warehouse not found");
  }

  return warehouse;
};

export const createWarehouse = async (data) => {
  return fulfillmentDb.createWarehouse(data);
};

export const updateWarehouse = async (id, data) => {
  const warehouse = await fulfillmentDb.findWarehouseById(id);

  if (!warehouse) {
    throw new NotFoundError("Warehouse not found");
  }

  return fulfillmentDb.updateWarehouse(id, data);
};

export const deleteWarehouse = async (id) => {
  const warehouse = await fulfillmentDb.findWarehouseById(id);

  if (!warehouse) {
    throw new NotFoundError("Warehouse not found");
  }

  return fulfillmentDb.deleteWarehouse(id);
};
