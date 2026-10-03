import { prisma } from "../../../config/prisma.js";

// ============================================================
// SHARED ADMIN PLAN INCLUDE
// ============================================================

const adminPlanInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },

  items: {
    include: {
      variant: {
        select: {
          id: true,
          sku: true,
          price: true,
          stock: true,
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
    orderBy: {
      createdAt: "asc",
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

  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
      createdAt: true,
    },
  },
};

// ============================================================
// PLAN LIST
// ============================================================

export const findPlans = async ({
  status,
  search,
  page,
  limit,
  tx = prisma,
}) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(status && {
      status,
    }),

    ...(search && {
      OR: [
        {
          planNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          customerName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          customerEmail: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          customerPhone: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    }),
  };

  const [plans, total] = await Promise.all([
    tx.installmentPlan.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },

        items: {
          select: {
            id: true,
            productName: true,
            variantLabel: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          },
        },

        installments: {
          select: {
            id: true,
            sequence: true,
            dueDate: true,
            amount: true,
            amountPaid: true,
            status: true,
            paidAt: true,
          },
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

      skip,
      take: limit,
    }),

    tx.installmentPlan.count({
      where,
    }),
  ]);

  return {
    plans,
    total,
  };
};

// ============================================================
// PLAN DETAIL
// ============================================================

export const findPlanById = async (planId, tx = prisma) =>
  tx.installmentPlan.findUnique({
    where: {
      id: planId,
    },
    include: adminPlanInclude,
  });

// ============================================================
// PLAN BY NUMBER
// ============================================================

export const findPlanByNumber = async (planNumber, tx = prisma) =>
  tx.installmentPlan.findUnique({
    where: {
      planNumber,
    },
    include: adminPlanInclude,
  });

// ============================================================
// STATS
// ============================================================

export const getPlanStats = async (tx = prisma) => {
  const [
    active,
    shippingDue,
    completed,
    orderFailed,
    cancelled,
    expired,
    financials,
  ] = await Promise.all([
    tx.installmentPlan.count({
      where: {
        status: "ACTIVE",
      },
    }),

    tx.installmentPlan.count({
      where: {
        status: "SHIPPING_DUE",
      },
    }),

    tx.installmentPlan.count({
      where: {
        status: "COMPLETED",
      },
    }),

    tx.installmentPlan.count({
      where: {
        status: "ORDER_FAILED",
      },
    }),

    tx.installmentPlan.count({
      where: {
        status: "CANCELLED",
      },
    }),

    tx.installmentPlan.count({
      where: {
        status: "EXPIRED",
      },
    }),

    tx.installmentPlan.aggregate({
      _sum: {
        totalAmount: true,
        amountPaid: true,
        balanceDue: true,
        productSubtotal: true,
        shippingCost: true,
      },
    }),
  ]);

  return {
    counts: {
      active,
      shippingDue,
      completed,
      orderFailed,
      cancelled,
      expired,
    },

    financials: {
      totalAmount: financials._sum.totalAmount ?? 0,
      amountPaid: financials._sum.amountPaid ?? 0,
      balanceDue: financials._sum.balanceDue ?? 0,
      productSubtotal: financials._sum.productSubtotal ?? 0,
      shippingCost: financials._sum.shippingCost ?? 0,
    },
  };
};

// ============================================================
// LOCK PLAN
// ============================================================

export const lockPlan = async (planId, tx = prisma) => {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${`flexpay:admin:plan:${planId}`}, 0)
    )
  `;

  return findPlanById(planId, tx);
};

// ============================================================
// CANCEL PLAN
// ============================================================

export const cancelPlan = async (
  planId,
  {
    cancelledAt,
  },
  tx = prisma,
) =>
  tx.installmentPlan.update({
    where: {
      id: planId,
    },

    data: {
      status: "CANCELLED",
      cancelledAt,
      nextDueAt: null,
    },
  });

// ============================================================
// RETRY ORDER SUPPORT
// ============================================================

export const updatePlanForOrderRetry = async (
  planId,
  {
    status,
    orderId,
    completedAt,
    balanceDue,
  },
  tx = prisma,
) =>
  tx.installmentPlan.update({
    where: {
      id: planId,
    },

    data: {
      status,
      orderId,
      completedAt,
      balanceDue,
      nextDueAt: null,
    },
  });

// ============================================================
// PAYMENT DETAILS
// ============================================================

export const findPaymentById = async (paymentId, tx = prisma) =>
  tx.payment.findUnique({
    where: {
      id: paymentId,
    },

    include: {
      installmentPlan: {
        select: {
          id: true,
          planNumber: true,
          userId: true,
          status: true,
        },
      },

      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
        },
      },

      allocations: {
        include: {
          installment: {
            select: {
              id: true,
              sequence: true,
              dueDate: true,
              amount: true,
              amountPaid: true,
              status: true,
            },
          },
        },
      },
    },
  });

// ============================================================
// PLAN PAYMENT HISTORY
// ============================================================

export const findPlanPayments = async (planId, tx = prisma) =>
  tx.payment.findMany({
    where: {
      installmentPlanId: planId,
      paymentType: "INSTALLMENT_PAYMENT",
    },

    include: {
      allocations: {
        include: {
          installment: {
            select: {
              id: true,
              sequence: true,
              amount: true,
              amountPaid: true,
              status: true,
              paidAt: true,
            },
          },
        },
      },
    },

    orderBy: {
      createdAt: "asc",
    },
  });