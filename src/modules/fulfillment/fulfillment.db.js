import { prisma } from "../../config/prisma.js";

const fulfillmentInclude = {
  items: {
    include: {
      variant: {
        include: {
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
      userId: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      shippingStreet: true,
      shippingCity: true,
      shippingState: true,
      shippingCountry: true,
    },
  },
};

export const createFulfillment = async (data, tx = prisma) => {
  return tx.fulfillment.create({
    data,
    include: fulfillmentInclude,
  });
};

export const findFulfillmentById = async (id) => {
  return prisma.fulfillment.findUnique({
    where: { id },
    include: fulfillmentInclude,
  });
};

export const findFulfillmentsByOrder = async (orderId) => {
  return prisma.fulfillment.findMany({
    where: { orderId },
    include: fulfillmentInclude,
    orderBy: { createdAt: "asc" },
  });
};

export const findFulfillments = async ({
  orderId,
  type,
  status,
  warehouseId,
  skip = 0,
  take = 20,
} = {}) => {
  const where = {
    ...(orderId && { orderId }),
    ...(type && { type }),
    ...(status && { status }),
    ...(warehouseId && { warehouseId }),
  };

  return Promise.all([
    prisma.fulfillment.findMany({
      where,
      include: fulfillmentInclude,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.fulfillment.count({ where }),
  ]);
};

export const updateFulfillment = async (id, data) => {
  return prisma.fulfillment.update({
    where: { id },
    data,
    include: fulfillmentInclude,
  });
};

export const updateFulfillmentStatus = async (id, status) => {
  return prisma.fulfillment.update({
    where: { id },
    data: { status },
    include: fulfillmentInclude,
  });
};

export const updateFulfillmentTracking = async (id, trackingData) => {
  return prisma.fulfillment.update({
    where: { id },
    data: {
      trackingNumber: trackingData.trackingNumber,
      carrier: trackingData.carrier,
      trackingUrl: trackingData.trackingUrl,
      estimatedDelivery: trackingData.estimatedDelivery,
    },
    include: fulfillmentInclude,
  });
};

export const deleteFulfillment = async (id) => {
  return prisma.fulfillment.delete({
    where: { id },
    include: fulfillmentInclude,
  });
};

export const findWarehouseById = async (id) => {
  return prisma.warehouse.findUnique({
    where: { id },
    include: {
      fulfillments: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });
};

export const findWarehouses = async ({
  isActive,
  search,
  skip = 0,
  take = 20,
} = {}) => {
  const where = {
    ...(typeof isActive === "boolean" && { isActive }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  return Promise.all([
    prisma.warehouse.findMany({
      where,
      include: {
        _count: {
          select: { fulfillments: true },
        },
      },
      skip,
      take,
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.count({ where }),
  ]);
};

export const createWarehouse = async (data) => {
  return prisma.warehouse.create({
    data,
  });
};

export const updateWarehouse = async (id, data) => {
  return prisma.warehouse.update({
    where: { id },
    data,
  });
};

export const deleteWarehouse = async (id) => {
  return prisma.warehouse.delete({
    where: { id },
  });
};
