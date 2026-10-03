import { prisma } from "../../../config/prisma.js";
import {
  BadRequestError,
  NotFoundError,
} from "../../../classes/errorClasses.js";

import * as adminInstallmentDb from "./adminInstallment.db.js";

const ACTIVE_STATUSES = ["ACTIVE", "SHIPPING_DUE"];

// ============================================================
// HELPERS
// ============================================================

const money = (value) => Number(Number(value).toFixed(2));

const serializePlan = (plan) => {
  if (!plan) return null;

  return {
    ...plan,

    productSubtotal: money(plan.productSubtotal),
    shippingCost: money(plan.shippingCost),
    totalAmount: money(plan.totalAmount),
    amountPaid: money(plan.amountPaid),
    balanceDue: money(plan.balanceDue),

    items: plan.items?.map((item) => ({
      ...item,
      unitPrice: money(item.unitPrice),
      totalPrice: money(item.totalPrice),

      variant: item.variant
        ? {
            ...item.variant,
            price: money(item.variant.price),
          }
        : undefined,
    })),

    installments: plan.installments?.map((installment) => ({
      ...installment,
      amount: money(installment.amount),
      amountPaid: money(installment.amountPaid),
    })),

    payments: plan.payments?.map((payment) => ({
      ...payment,
      amount: money(payment.amount),
    })),
  };
};

// ============================================================
// LIST
// ============================================================

export const getPlans = async ({ status, search, page = 1, limit = 20 }) => {
  const result = await adminInstallmentDb.findPlans({
    status,
    search,
    page,
    limit,
  });

  return {
    data: result.plans.map(serializePlan),

    meta: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};

// ============================================================
// DETAIL
// ============================================================

export const getPlan = async (planId) => {
  const plan = await adminInstallmentDb.findPlanById(planId);

  if (!plan) {
    throw new NotFoundError("FlexPay plan not found");
  }

  return serializePlan(plan);
};

// ============================================================
// STATS
// ============================================================

export const getStats = async () => {
  const stats = await adminInstallmentDb.getPlanStats();

  return {
    counts: stats.counts,

    financials: {
      totalAmount: money(stats.financials.totalAmount),
      amountPaid: money(stats.financials.amountPaid),
      balanceDue: money(stats.financials.balanceDue),
      productSubtotal: money(stats.financials.productSubtotal),
      shippingCost: money(stats.financials.shippingCost),
    },
  };
};

// ============================================================
// CANCEL
// ============================================================

export const cancelPlan = async (planId) => {
  const result = await prisma.$transaction(async (tx) => {
    const plan = await adminInstallmentDb.lockPlan(planId, tx);

    if (!plan) {
      throw new NotFoundError("FlexPay plan not found");
    }

    if (!ACTIVE_STATUSES.includes(plan.status)) {
      throw new BadRequestError(
        `FlexPay plan cannot be cancelled from ${plan.status}`,
      );
    }

    if (plan.orderId) {
      throw new BadRequestError(
        "FlexPay plan already has an order and cannot be cancelled",
      );
    }

    const pendingPayment = plan.payments?.find(
      (payment) =>
        payment.paymentType === "INSTALLMENT_PAYMENT" &&
        payment.status === "PENDING",
    );

    if (pendingPayment) {
      throw new BadRequestError(
        "This FlexPay plan has a pending payment and cannot be cancelled",
      );
    }

    await adminInstallmentDb.cancelPlan(
      plan.id,
      {
        cancelledAt: new Date(),
      },
      tx,
    );

    return adminInstallmentDb.findPlanById(plan.id, tx);
  });

  return serializePlan(result);
};

// ============================================================
// PAYMENT DETAIL
// ============================================================

export const getPayment = async (paymentId) => {
  const payment = await adminInstallmentDb.findPaymentById(paymentId);

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  if (payment.paymentType !== "INSTALLMENT_PAYMENT") {
    throw new BadRequestError("Payment is not a FlexPay payment");
  }

  return {
    ...payment,
    amount: money(payment.amount),

    allocations: payment.allocations?.map((allocation) => ({
      ...allocation,

      amount: money(allocation.amount),

      installment: allocation.installment
        ? {
            ...allocation.installment,
            amount: money(allocation.installment.amount),
            amountPaid: money(allocation.installment.amountPaid),
          }
        : null,
    })),
  };
};

// ============================================================
// PLAN PAYMENT HISTORY
// ============================================================

export const getPlanPayments = async (planId) => {
  const plan = await adminInstallmentDb.findPlanById(planId);

  if (!plan) {
    throw new NotFoundError("FlexPay plan not found");
  }

  const payments = await adminInstallmentDb.findPlanPayments(planId);

  return payments.map((payment) => ({
    ...payment,

    amount: money(payment.amount),

    allocations: payment.allocations?.map((allocation) => ({
      ...allocation,

      amount: money(allocation.amount),

      installment: allocation.installment
        ? {
            ...allocation.installment,
            amount: money(allocation.installment.amount),
            amountPaid: money(allocation.installment.amountPaid),
          }
        : null,
    })),
  }));
};
