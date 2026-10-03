import { prisma } from "../../config/prisma.js";

export const createPayment = (data, tx = prisma) =>
  tx.payment.create({
    data,
  });

export const findPaymentByReference = (reference, tx = prisma) =>
  tx.payment.findUnique({
    where: {
      reference,
    },

    include: {
      order: true,

      installmentPlan: true,
    },
  });

export const findPaymentByProviderReference = (
  providerReference,
  tx = prisma,
) =>
  tx.payment.findUnique({
    where: {
      providerReference,
    },

    include: {
      order: true,

      installmentPlan: true,
    },
  });

export const updatePaymentByReference = (reference, data, tx = prisma) =>
  tx.payment.update({
    where: {
      reference,
    },

    data,

    include: {
      order: true,

      installmentPlan: true,
    },
  });

export const updatePaymentByProviderReference = (
  providerReference,
  data,
  tx = prisma,
) =>
  tx.payment.update({
    where: {
      providerReference,
    },

    data,

    include: {
      order: true,

      installmentPlan: true,
    },
  });

export const findPaymentForUpdate = (reference, tx = prisma) =>
  tx.payment.findUnique({
    where: {
      reference,
    },

    include: {
      order: true,

      installmentPlan: true,
    },
  });
