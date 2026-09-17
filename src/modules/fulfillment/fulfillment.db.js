// src/modules/fulfillment/fulfillment.db.js

import { prisma } from "../../config/prisma.js";

// ============================================================
// SHARED INCLUDE
// ============================================================

const fulfillmentInclude = {
  items: {
    include: {
      variant: {
        select: {
          id: true,
          sku: true,
          price: true,
          weight: true,
          fulfillmentType: true,
          shippingType: true,
          length: true,
          width: true,
          height: true,
          actualWeight: true,

          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  },

  warehouse: true,

  order: {
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      shippingLabel: true,
      shippingStreet: true,
      shippingCity: true,
      shippingState: true,
      shippingCountry: true,
    },
  },
};

// ============================================================
// CREATE
// ============================================================

export const createFulfillment = async (data, tx = prisma) => {
  return tx.fulfillment.create({
    data,
    include: fulfillmentInclude,
  });
};

// ============================================================
// FIND BY ID
// ============================================================

export const findFulfillmentById = async (id, tx = prisma) => {
  return tx.fulfillment.findUnique({
    where: {
      id,
    },
    include: fulfillmentInclude,
  });
};

// ============================================================
// FIND BY ORDER ID
// ============================================================

export const findFulfillmentsByOrderId = async (orderId, tx = prisma) => {
  return tx.fulfillment.findMany({
    where: {
      orderId,
    },
    include: fulfillmentInclude,
    orderBy: {
      createdAt: "asc",
    },
  });
};

// ============================================================
// FIND ALL WITH FILTERS AND PAGINATION
// ============================================================

export const findFulfillments = async (
  { page = 1, limit = 20, orderId, type, status, warehouseId } = {},
  tx = prisma,
) => {
  // Express query parameters arrive as strings.
  // Convert them before passing them to Prisma.
  const parsedPage = Math.max(1, Number(page) || 1);

  const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));

  const skip = (parsedPage - 1) * parsedLimit;

  const where = {};

  if (orderId) {
    where.orderId = orderId;
  }

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  if (warehouseId) {
    where.warehouseId = warehouseId;
  }

  const [fulfillments, total] = await Promise.all([
    tx.fulfillment.findMany({
      where,
      skip,
      take: parsedLimit,
      include: fulfillmentInclude,
      orderBy: {
        createdAt: "desc",
      },
    }),

    tx.fulfillment.count({
      where,
    }),
  ]);

  return {
    fulfillments,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

// ============================================================
// UPDATE TRACKING
// ============================================================

export const updateFulfillmentTracking = async (id, data, tx = prisma) => {
  return tx.fulfillment.update({
    where: {
      id,
    },
    data,
    include: fulfillmentInclude,
  });
};

// ============================================================
// DELETE
// ============================================================

export const deleteFulfillment = async (id, tx = prisma) => {
  return tx.fulfillment.delete({
    where: {
      id,
    },
  });
};
