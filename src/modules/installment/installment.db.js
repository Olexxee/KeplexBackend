import { prisma } from "../../config/prisma.js";

// ============================================================
// SHARED INCLUDE
// ============================================================

const planInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: true,
        },
      },
    },
  },

  installments: {
    orderBy: {
      sequence: "asc",
    },
  },

  payments: {
    orderBy: {
      createdAt: "asc",
    },
  },

  order: true,
};

// ============================================================
// PLAN NUMBER
// ============================================================

export const generatePlanNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();

  const random = Math.random().toString(36).substring(2, 7).toUpperCase();

  return `FP-${timestamp}-${random}`;
};

// ============================================================
// TRANSACTION LOCKS
// ============================================================

/*
 * PostgreSQL transaction-scoped advisory lock.
 *
 * This serializes FlexPay plan creation for the same user.
 * The lock automatically disappears when the transaction ends.
 */
export const lockUserForPlanCreation = async (userId, tx = prisma) => {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${userId}, 0)
    )
  `;
};

/*
 * Locks one FlexPay plan row for the duration of the
 * current transaction.
 *
 * This is important when multiple successful payments hit
 * the same plan concurrently.
 */
export const lockPlan = async (planId, tx = prisma) => {
  await tx.$queryRaw`
    SELECT id
    FROM "InstallmentPlan"
    WHERE id = ${planId}
    FOR UPDATE
  `;

  return tx.installmentPlan.findUnique({
    where: {
      id: planId,
    },

    include: planInclude,
  });
};

// ============================================================
// ACTIVE PLAN
// ============================================================

export const findActivePlanByUser = async (userId, tx = prisma) => {
  return tx.installmentPlan.findFirst({
    where: {
      userId,

      status: {
        in: ["ACTIVE", "SHIPPING_DUE"],
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    include: planInclude,
  });
};

// ============================================================
// VARIANTS
// ============================================================

export const findVariantsByIds = async (variantIds, tx = prisma) => {
  return tx.productVariant.findMany({
    where: {
      id: {
        in: variantIds,
      },
    },

    include: {
      product: true,
    },
  });
};

// ============================================================
// CART
// ============================================================

export const findCartItemsForPlan = async (
  userId,
  cartItemIds,
  tx = prisma,
) => {
  return tx.cartItem.findMany({
    where: {
      id: {
        in: cartItemIds,
      },

      cart: {
        userId,
        status: "ACTIVE",
      },
    },

    include: {
      variant: {
        include: {
          product: true,
        },
      },
    },
  });
};

// ============================================================
// CREATE PLAN
// ============================================================

export const createPlan = async (data, tx = prisma) => {
  return tx.installmentPlan.create({
    data,

    include: planInclude,
  });
};

// ============================================================
// CREATE PLAN ITEMS
// ============================================================

export const createPlanItems = async (planId, items, tx = prisma) => {
  return tx.installmentPlanItem.createMany({
    data: items.map((item) => ({
      planId,

      variantId: item.variantId,

      sku: item.sku,

      productName: item.productName,

      variantLabel: item.variantLabel || null,

      quantity: item.quantity,

      unitPrice: item.unitPrice,

      totalPrice: item.totalPrice,
    })),
  });
};

// ============================================================
// CREATE INSTALLMENTS
// ============================================================

export const createInstallments = async (planId, installments, tx = prisma) => {
  return tx.installment.createMany({
    data: installments.map((installment) => ({
      planId,

      sequence: installment.sequence,

      dueDate: installment.dueDate,

      amount: installment.amount,

      amountPaid: 0,

      status: "PENDING",
    })),
  });
};

// ============================================================
// SINGLE PLAN
// ============================================================

export const findPlanById = async (id, tx = prisma) => {
  return tx.installmentPlan.findUnique({
    where: {
      id,
    },

    include: planInclude,
  });
};

export const findPlanForUser = async (id, userId, tx = prisma) => {
  return tx.installmentPlan.findFirst({
    where: {
      id,
      userId,
    },

    include: planInclude,
  });
};

export const findPlanByNumber = async (planNumber, tx = prisma) => {
  return tx.installmentPlan.findUnique({
    where: {
      planNumber,
    },

    include: planInclude,
  });
};

// ============================================================
// PLANS
// ============================================================

export const findUserPlans = async (userId, tx = prisma) => {
  return tx.installmentPlan.findMany({
    where: {
      userId,
    },

    include: {
      items: true,

      installments: {
        orderBy: {
          sequence: "asc",
        },
      },

      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

// ============================================================
// PAYMENT LOOKUP
// ============================================================

export const findPlanPaymentByReference = async (reference, tx = prisma) => {
  return tx.payment.findUnique({
    where: {
      reference,
    },

    include: {
      installmentPlan: true,
    },
  });
};

export const findPendingPaymentByPlan = async (planId, tx = prisma) => {
  return tx.payment.findFirst({
    where: {
      installmentPlanId: planId,

      paymentType: "INSTALLMENT_PAYMENT",

      provider: "PAYSTACK",

      status: "PENDING",
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

export const updatePlanPayment = async (paymentId, data, tx = prisma) => {
  return tx.payment.update({
    where: {
      id: paymentId,
    },

    data,
  });
};

// ============================================================
// PAYMENT
// ============================================================

export const createPlanPayment = async (data, tx = prisma) => {
  return tx.payment.create({
    data,
  });
};

// ============================================================
// PAYMENT ALLOCATION
// ============================================================

export const createAllocation = async (data, tx = prisma) => {
  return tx.installmentAllocation.create({
    data,
  });
};

// ============================================================
// PLAN BALANCE
// ============================================================

export const updatePlanBalance = async (
  planId,
  {
    amountPaid,
    balanceDue,
    status,
    shippingCost,
    totalAmount,
    nextDueAt,
    firstPaymentAt,
  },
  tx = prisma,
) => {
  return tx.installmentPlan.update({
    where: {
      id: planId,
    },

    data: {
      amountPaid,

      balanceDue,

      status,

      ...(shippingCost !== undefined && {
        shippingCost,
      }),

      ...(totalAmount !== undefined && {
        totalAmount,
      }),

      ...(nextDueAt !== undefined && {
        nextDueAt,
      }),

      ...(firstPaymentAt !== undefined && {
        firstPaymentAt,
      }),
    },
  });
};

// ============================================================
// INSTALLMENT PAYMENT
// ============================================================

export const updateInstallment = async (id, data, tx = prisma) => {
  return tx.installment.update({
    where: {
      id,
    },

    data,
  });
};

// ============================================================
// PAYMENT IDEMPOTENCY
// ============================================================

export const transitionPaymentStatus = async (
  reference,
  fromStatus,
  toStatus,
  providerPayload,
  tx = prisma,
) => {
  const result = await tx.payment.updateMany({
    where: {
      reference,

      status: fromStatus,
    },

    data: {
      status: toStatus,

      ...(providerPayload !== undefined && {
        providerPayload,
      }),
    },
  });

  return result.count === 1;
};

// ============================================================
// ORDER LINK
// ============================================================

export const attachPlanToOrder = async (planId, orderId, tx = prisma) => {
  return tx.installmentPlan.update({
    where: {
      id: planId,
    },

    data: {
      orderId,
    },
  });
};

export const attachPlanPaymentsToOrder = async (
  planId,
  orderId,
  tx = prisma,
) => {
  return tx.payment.updateMany({
    where: {
      installmentPlanId: planId,

      status: "SUCCESS",
    },

    data: {
      orderId,
    },
  });
};
