// modules/shipping/shipping.db.js
import { prisma } from "../../config/prisma.js";

export const createShippingConfig = (data) => {
  return prisma.shippingConfiguration.create({ data });
};

export const findShippingConfigById = (id) => {
  return prisma.shippingConfiguration.findUnique({
    where: { id },
  });
};

export const findShippingConfigs = (filters = {}) => {
  const { isActive, type } = filters;
  const where = {
    ...(typeof isActive === "boolean" && { isActive }),
    ...(type && { type }),
  };

  return prisma.shippingConfiguration.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
};

export const getActiveShippingConfig = () => {
  return prisma.shippingConfiguration.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
};

export const updateShippingConfig = (id, data) => {
  return prisma.shippingConfiguration.update({
    where: { id },
    data,
  });
};

export const deleteShippingConfig = (id) => {
  return prisma.shippingConfiguration.delete({
    where: { id },
  });
};

export const createShippingRule = (data) => {
  return prisma.shippingRule.create({ data });
};

export const findShippingRules = (filters = {}) => {
  const { isActive, type } = filters;
  const where = {
    ...(typeof isActive === "boolean" && { isActive }),
    ...(type && { type }),
  };

  return prisma.shippingRule.findMany({
    where,
    orderBy: { priority: "asc" },
  });
};

export const updateOrderCBM = (orderId, cbmData) => {
  return prisma.order.update({
    where: { id: orderId },
    data: {
      metadata: {
        ...cbmData,
        calculatedAt: new Date(),
      },
    },
  });
};
