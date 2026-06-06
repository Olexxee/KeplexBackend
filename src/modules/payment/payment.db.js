import { prisma } from "../../config/prisma.js";

export const createPayment = (data) => prisma.payment.create({ data });

export const findPaymentByReference = (reference) =>
  prisma.payment.findUnique({
    where: { reference },
    include: { order: true },
  });

export const updatePaymentByReference = (reference, data) =>
  prisma.payment.update({
    where: { reference },
    data,
    include: { order: true },
  });

// Called by payment.service.js after a successful payment verification
export const markOrderConfirmed = (orderId) =>
  prisma.order.update({
    where: { id: orderId },
    data: { status: "CONFIRMED" },
  });
