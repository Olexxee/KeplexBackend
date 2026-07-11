// modules/fulfillment/fulfillment.service.js
import { NotFoundError, BadRequestError } from "../../classes/errorClasses.js";
import {
  getPaginationParams,
  formatPaginatedResponse,
} from "../../lib/pagination.js";
import { ShippingCalculator } from "../shipping/shipping.calculator.js";
import * as fulfillmentDb from "./fulfillment.db.js";
import { OrderSplitter } from "./order.splitter.js";
import * as orderDb from "../orders/order.db.js";
import { prisma } from "../../config/prisma.js";

// ============================================================================
// FULFILLMENT CRUD
// ============================================================================

export const getFulfillments = async (filters) => {
  const { page, limit, orderId, type, status, warehouseId } = filters;
  const { skip, take } = getPaginationParams(page, limit);

  const [data, total] = await fulfillmentDb.findFulfillments({
    orderId,
    type,
    status,
    warehouseId,
    skip,
    take,
  });

  return formatPaginatedResponse({ data, total, page, limit });
};

export const getFulfillmentById = async (id) => {
  const fulfillment = await fulfillmentDb.findFulfillmentById(id);
  if (!fulfillment) {
    throw new NotFoundError("Fulfillment not found");
  }
  return fulfillment;
};

export const getFulfillmentsByOrder = async (orderId) => {
  const order = await orderDb.findOrderById(orderId);
  if (!order) {
    throw new NotFoundError("Order not found");
  }
  return fulfillmentDb.findFulfillmentsByOrder(orderId);
};

export const updateFulfillmentStatus = async (id, status, userId) => {
  return prisma.$transaction(async (tx) => {
    const fulfillment = await tx.fulfillment.findUnique({
      where: { id },
      include: {
        order: true,
        items: true,
      },
    });

    if (!fulfillment) {
      throw new NotFoundError("Fulfillment not found");
    }

    // Validate status transition
    const validTransitions = {
      PENDING: ["PROCESSING", "CANCELLED"],
      PROCESSING: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED", "CANCELLED"],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!validTransitions[fulfillment.status]?.includes(status)) {
      throw new BadRequestError(
        `Invalid status transition: ${fulfillment.status} → ${status}`,
      );
    }

    // Update fulfillment status
    const updatedFulfillment = await fulfillmentDb.updateFulfillmentStatus(
      id,
      status,
    );

    // Update order status if all fulfillments are completed
    await checkAndUpdateOrderStatus(fulfillment.orderId, tx);

    // Log status change
    await fulfillmentDb.createAuditLog(
      {
        userId,
        action: "FULFILLMENT_STATUS_CHANGE",
        entity: "Fulfillment",
        entityId: id,
        metadata: {
          from: fulfillment.status,
          to: status,
          orderId: fulfillment.orderId,
        },
      },
      tx,
    );

    return updatedFulfillment;
  });
};

export const updateFulfillmentTracking = async (id, trackingData) => {
  const fulfillment = await fulfillmentDb.findFulfillmentById(id);
  if (!fulfillment) {
    throw new NotFoundError("Fulfillment not found");
  }

  return fulfillmentDb.updateFulfillmentTracking(id, trackingData);
};

export const deleteFulfillment = async (id) => {
  const fulfillment = await fulfillmentDb.findFulfillmentById(id);
  if (!fulfillment) {
    throw new NotFoundError("Fulfillment not found");
  }

  if (fulfillment.status !== "PENDING") {
    throw new BadRequestError("Cannot delete non-pending fulfillment");
  }

  return fulfillmentDb.deleteFulfillment(id);
};

// ============================================================================
// FULFILLMENT GENERATION
// ============================================================================

export const createFulfillmentsForOrder = async (orderId) => {
  const order = await orderDb.findOrderById(orderId);
  if (!order) {
    throw new NotFoundError("Order not found");
  }

  // Split order items
  const splitter = new OrderSplitter();
  const groups = splitter.splitOrderByFulfillment(order.items);

  // Calculate fulfillment metrics using ShippingCalculator
  const fulfillmentMetrics = ShippingCalculator.calculateFulfillment(groups);

  // Create fulfillments with metrics
  const fulfillments = [];
  for (const [type, items] of Object.entries(groups)) {
    if (items.length === 0) continue;

    const warehouseId = await splitter.assignWarehouse(type, items);
    const metrics = fulfillmentMetrics[type];

    const fulfillment = await fulfillmentDb.createFulfillment({
      orderId,
      type,
      warehouseId,
      status: "PENDING",
      shippingCost: 0, // Will be calculated by shipping service
      items: {
        create: items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPriceSnapshot),
        })),
      },
      // Store calculated metrics for reference
      metadata: {
        totalCBM: metrics?.totalCBM || 0,
        totalWeight: metrics?.totalChargeableWeight || 0,
        subtotal: metrics?.subtotal || 0,
      },
    });

    fulfillments.push(fulfillment);
  }

  return fulfillments;
};

// ============================================================================
// WAREHOUSE CRUD
// ============================================================================

export const getWarehouses = async (filters) => {
  const { page, limit, isActive, search } = filters;
  const { skip, take } = getPaginationParams(page, limit);

  const [data, total] = await fulfillmentDb.findWarehouses({
    isActive,
    search,
    skip,
    take,
  });

  return formatPaginatedResponse({ data, total, page, limit });
};

export const getWarehouseById = async (id) => {
  const warehouse = await fulfillmentDb.findWarehouseById(id);
  if (!warehouse) {
    throw new NotFoundError("Warehouse not found");
  }
  return warehouse;
};

export const createWarehouse = async (payload) => {
  // Check for duplicate code
  const [existing] = await fulfillmentDb.findWarehouses({
    search: payload.code,
  });
  if (existing && existing.length > 0) {
    throw new BadRequestError("Warehouse with this code already exists");
  }

  return fulfillmentDb.createWarehouse(payload);
};

export const updateWarehouse = async (id, payload) => {
  const warehouse = await fulfillmentDb.findWarehouseById(id);
  if (!warehouse) {
    throw new NotFoundError("Warehouse not found");
  }

  return fulfillmentDb.updateWarehouse(id, payload);
};

export const deleteWarehouse = async (id) => {
  const warehouse = await fulfillmentDb.findWarehouseById(id);
  if (!warehouse) {
    throw new NotFoundError("Warehouse not found");
  }

  // Check if warehouse has fulfillments
  if (warehouse.fulfillments?.length > 0) {
    throw new BadRequestError(
      "Cannot delete warehouse with active fulfillments",
    );
  }

  return fulfillmentDb.deleteWarehouse(id);
};

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Check and update order status based on fulfillments
 */
const checkAndUpdateOrderStatus = async (orderId, tx) => {
  const fulfillments = await tx.fulfillment.findMany({
    where: { orderId },
  });

  const allCompleted = fulfillments.every((f) => f.status === "DELIVERED");
  const anyShipped = fulfillments.some((f) => f.status === "SHIPPED");
  const anyProcessing = fulfillments.some((f) => f.status === "PROCESSING");
  const allCancelled = fulfillments.every((f) => f.status === "CANCELLED");

  let newStatus = null;
  if (allCancelled) {
    newStatus = "CANCELLED";
  } else if (allCompleted) {
    newStatus = "COMPLETED";
  } else if (anyShipped) {
    newStatus = "SHIPPED";
  } else if (anyProcessing) {
    newStatus = "PROCESSING";
  }

  if (newStatus) {
    await orderDb.updateOrderStatusTx(orderId, { status: newStatus }, tx);
  }
};
