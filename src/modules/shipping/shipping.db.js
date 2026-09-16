import { prisma } from "../../config/prisma.js";

// ============================================================
// SHIPPING CONFIGURATION
// ============================================================

export const createShippingConfig = async (
  data,
  tx = prisma,
) => {
  return tx.shippingConfiguration.create({
    data,
    include: {
      rules: {
        orderBy: {
          priority: "asc",
        },
      },
    },
  });
};

export const updateShippingConfig = async (
  id,
  data,
  tx = prisma,
) => {
  return tx.shippingConfiguration.update({
    where: { id },
    data,
    include: {
      rules: {
        orderBy: {
          priority: "asc",
        },
      },
    },
  });
};

export const findShippingConfigById = async (
  id,
  tx = prisma,
) => {
  return tx.shippingConfiguration.findUnique({
    where: { id },
    include: {
      rules: {
        orderBy: {
          priority: "asc",
        },
      },
    },
  });
};

export const getActiveShippingConfig = async (
  tx = prisma,
) => {
  return tx.shippingConfiguration.findFirst({
    where: {
      status: "ACTIVE",
    },
    include: {
      rules: {
        where: {
          isActive: true,
        },
        orderBy: {
          priority: "asc",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
};

export const findShippingConfigs = async (
  tx = prisma,
) => {
  return tx.shippingConfiguration.findMany({
    include: {
      rules: {
        orderBy: {
          priority: "asc",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
};

// ============================================================
// SHIPPING RULES
// ============================================================

export const createShippingRule = async (
  data,
  tx = prisma,
) => {
  return tx.shippingRule.create({
    data,
  });
};

export const updateShippingRule = async (
  id,
  data,
  tx = prisma,
) => {
  return tx.shippingRule.update({
    where: { id },
    data,
  });
};

export const findShippingRuleById = async (
  id,
  tx = prisma,
) => {
  return tx.shippingRule.findUnique({
    where: { id },
  });
};

export const findShippingRules = async (
  {
    configurationId,
    type,
    isActive,
  } = {},
  tx = prisma,
) => {
  const where = {};

  if (configurationId) {
    where.configurationId = configurationId;
  }

  if (type) {
    where.type = type;
  }

  if (typeof isActive === "boolean") {
    where.isActive = isActive;
  }

  return tx.shippingRule.findMany({
    where,
    orderBy: {
      priority: "asc",
    },
  });
};

export const deleteShippingRule = async (
  id,
  tx = prisma,
) => {
  return tx.shippingRule.delete({
    where: { id },
  });
};

// ============================================================
// ORDER CBM
// ============================================================

export const updateOrderCBM = async (
  orderId,
  {
    totalCBM,
    totalChargeableWeight,
    items,
    updatedBy = null,
  },
  tx = prisma,
) => {
  return tx.order.update({
    where: {
      id: orderId,
    },
    data: {
      cbm: totalCBM,
      chargeableWeight: totalChargeableWeight,
      cbmData: items,
      cbmUpdatedAt: new Date(),
      cbmUpdatedBy: updatedBy,
    },
  });
};

