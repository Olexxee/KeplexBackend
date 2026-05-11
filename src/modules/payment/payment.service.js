import axios from "axios";

import { env } from "../../config/env.js";
import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";
import { enqueueNotification } from "../../queues/notification.queue.js";
import * as paymentDb from "./payment.db.js";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

const FINAL_PAYMENT_STATUSES = ["SUCCESS", "FAILED", "REVERSED"];

const generateReference = (orderId) => {
  return `KPX-${orderId}-${Date.now()}`;
};

const toKobo = (amount) => {
  return Math.round(Number(amount) * 100);
};

const mapPaystackStatus = (status) => {
  if (status === "success") return "SUCCESS";
  if (status === "failed") return "FAILED";
  if (status === "abandoned") return "ABANDONED";
  if (status === "reversed") return "REVERSED";

  return "PENDING";
};

export const initializePayment = async ({ orderId, user }) => {
  const order = await paymentDb.findOrderById(orderId);

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  const isOwner = order.userId === user.id;
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user.role);

  if (!isOwner && !isAdmin) {
    throw new NotFoundError("Order not found");
  }

  if (order.status !== "PENDING") {
    throw new BadRequestError("Only pending orders can be paid for");
  }

  const existingPendingPayment = order.payments.find(
    (payment) => payment.status === "PENDING",
  );

  if (existingPendingPayment?.authorizationUrl) {
    return existingPendingPayment;
  }

  const customerEmail = order.customerEmail || order.user?.email;

  if (!customerEmail) {
    throw new BadRequestError(
      "Customer email is required to initialize payment",
    );
  }

  const reference = generateReference(order.id);

  const response = await axios.post(
    `${PAYSTACK_BASE_URL}/transaction/initialize`,
    {
      email: customerEmail,
      amount: toKobo(order.totalAmount),
      reference,
      callback_url: env.paystack.callbackUrl,
      currency: "NGN",
      metadata: {
        orderId: order.id,
        userId: order.userId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${env.paystack.secretKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const paystackData = response.data?.data;

  if (!response.data?.status || !paystackData?.authorization_url) {
    throw new BadRequestError("Unable to initialize payment");
  }

  return paymentDb.createPayment({
    orderId: order.id,
    provider: "PAYSTACK",
    reference,
    amount: order.totalAmount,
    currency: "NGN",
    status: "PENDING",
    authorizationUrl: paystackData.authorization_url,
    accessCode: paystackData.access_code,
    providerPayload: response.data,
  });
};

export const verifyPayment = async (reference) => {
  const existingPayment = await paymentDb.findPaymentByReference(reference);

  if (!existingPayment) {
    throw new NotFoundError("Payment not found");
  }

  if (FINAL_PAYMENT_STATUSES.includes(existingPayment.status)) {
    return existingPayment;
  }

  const response = await axios.get(
    `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${env.paystack.secretKey}`,
      },
    },
  );

  const paystackData = response.data?.data;

  if (!response.data?.status || !paystackData) {
    throw new BadRequestError("Unable to verify payment");
  }

  const mappedStatus = mapPaystackStatus(paystackData.status);

  const updatedPayment = await paymentDb.updatePaymentByReference(reference, {
    status: mappedStatus,
    providerPayload: response.data,
  });

  const shouldConfirmOrder =
    mappedStatus === "SUCCESS" && updatedPayment.order.status === "PENDING";

  if (shouldConfirmOrder) {
    const confirmedOrder = await paymentDb.markOrderConfirmed(
      updatedPayment.orderId,
    );

    await enqueueNotification("ORDER_CONFIRMED", {
      order: confirmedOrder,
    });
  }

  return updatedPayment;
};
