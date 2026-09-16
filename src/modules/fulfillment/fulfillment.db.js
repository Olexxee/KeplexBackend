import { prisma } from "../../config/prisma.js";

// ============================================================
// SHARED INCLUDES
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
// FULFILLMENTS
// ============================================================

export const createFulfillment = async (
  data,
  tx = prisma,
) => {
  return tx.fulfillment.create({
    data,
    include: fulfillmentInclude,
  });
};

export const findFulfillmentById = async (
  id,
  tx = prisma,
) => {
  return tx.fulfillment.findUnique({
    where: {
      id,
    },
    include: fulfillmentInclude,
  });
};

export const findFulfillmentsByOrderId = async (
  orderId,
  tx = prisma,
) => {
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

export const findFulfillments = async (
  {
    type,
    status,
    warehouseId,
    page = 1,
    limit = 20,
  } = {},
  tx = prisma,
) => {
  const where = {};

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  if (warehouseId) {
    where.warehouseId = warehouseId;
  }

  const skip = (page - 1) * limit;

  const [fulfillments, total] =
    await Promise.all([
      tx.fulfillment.findMany({
        where,
        skip,
        take: limit,
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
      page,
      limit,
      total,
      totalPages: Math.ceil(
        total / limit,
      ),
    },
  };
};

export const updateFulfillment = async (
  id,
  data,
  tx = prisma,
) => {
  return tx.fulfillment.update({
    where: {
      id,
    },

    data,

    include: fulfillmentInclude,
  });
};

export const updateFulfillmentStatus = async (
  id,
  status,
  tx = prisma,
) => {
  return tx.fulfillment.update({
    where: {
      id,
    },

    data: {
      status,
    },

    include: fulfillmentInclude,
  });
};

export const updateFulfillmentTracking = async (
  id,
  data,
  tx = prisma,
) => {
  return tx.fulfillment.update({
    where: {
      id,
    },

    data,

    include: fulfillmentInclude,
  });
};

export const deleteFulfillment = async (
  id,
  tx = prisma,
) => {
  return tx.fulfillment.delete({
    where: {
      id,
    },
  });
};

// ============================================================
// WAREHOUSES
// ============================================================

export const findWarehouses = async (
  {
    type,
    isActive,
  } = {},
  tx = prisma,
) => {
  const where = {};

  if (type) {
    where.type = type;
  }

  if (typeof isActive === "boolean") {
    where.isActive = isActive;
  }

  return tx.warehouse.findMany({
    where,

    orderBy: [
      {
        isActive: "desc",
      },
      {
        name: "asc",
      },
    ],
  });
};

export const findWarehouseById = async (
  id,
  tx = prisma,
) => {
  return tx.warehouse.findUnique({
    where: {
      id,
    },
  });
};

export const findActiveWarehouseByType = async (
  type,
  tx = prisma,
) => {
  return tx.warehouse.findFirst({
    where: {
      type,
      isActive: true,
    },

    orderBy: {
      name: "asc",
    },
  });
};

export const createWarehouse = async (
  data,
  tx = prisma,
) => {
  return tx.warehouse.create({
    data,
  });
};

export const updateWarehouse = async (
  id,
  data,
  tx = prisma,
) => {
  return tx.warehouse.update({
    where: {
      id,
    },

    data,
  });
};

export const deleteWarehouse = async (
  id,
  tx = prisma,
) => {
  const fulfillmentCount =
    await tx.fulfillment.count({
      where: {
        warehouseId: id,
      },
    });

  if (fulfillmentCount > 0) {
    throw new Error(
      "Cannot delete a warehouse that has fulfillment history",
    );
  }

  return tx.warehouse.delete({
    where: {
      id,
    },
  });
};
