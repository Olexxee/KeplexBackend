import { prisma } from "../../config/prisma.js";

export const findOrderById = async (orderId) => {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    },
  });
};

export const createPayment = async (data) => {
  return prisma.payment.create({
    data,
  });
};

export const findPaymentByReference = async (reference) => {
  return prisma.payment.findUnique({
    where: { reference },
    include: {
      order: true,
    },
  });
};

export const updatePaymentByReference = async (reference, data) => {
  return prisma.payment.update({
    where: { reference },
    data,
    include: {
      order: true,
    },
  });
};

export const markOrderConfirmed = async (orderId) => {
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CONFIRMED",
    },
  });
};
