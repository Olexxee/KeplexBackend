import * as paystack from "./paymentGateway/paystack.js";
import * as paymentDb from "./payment.db.js";
import * as installmentService from "../installment/installment.service.js";
import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";
import { prisma } from "../../config/prisma.js";
import { orderQueue } from "../../jobs/queues/order.queue.js";


const PAYMENT_PROVIDER = "PAYSTACK";

const PAYMENT_FINAL_STATUSES = ["SUCCESS", "FAILED", "ABANDONED", "REVERSED"];

const isFinalPaymentStatus = (status) =>
  PAYMENT_FINAL_STATUSES.includes(status);

const toKobo = (amount) => {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    throw new BadRequestError("Invalid payment amount");
  }

  return Math.round(value * 100);
};

const assertPaymentAmount = ({ providerAmount, expectedAmount, reference }) => {
  const actualKobo = toKobo(providerAmount);
  const expectedKobo = toKobo(expectedAmount);

  if (actualKobo !== expectedKobo) {
    throw new BadRequestError(
      `Payment amount mismatch for reference ${reference}`,
    );
  }
};

export const initializePayment = async ({
  order,
  user,
  provider = PAYMENT_PROVIDER,
  paymentData = {},
}) => {
  if (!order) {
    throw new NotFoundError("Order not found");
  }

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const isOwner = order.userId === user.id;

  const isAdmin = ["SUPER_ADMIN", "ADMIN", "STAFF"].includes(user.role);

  if (!isOwner && !isAdmin) {
    throw new NotFoundError("Order not found");
  }

  if (order.status !== "PENDING") {
    throw new BadRequestError("Only pending orders can be paid for");
  }

  const normalizedProvider = String(provider).toUpperCase();

  if (normalizedProvider !== PAYMENT_PROVIDER) {
    throw new BadRequestError(`Unsupported payment provider: ${provider}`);
  }

  const existing = order.payments?.find(
    (payment) =>
      payment.provider === PAYMENT_PROVIDER && payment.status === "PENDING",
  );

  if (existing) {
    return existing;
  }

  return initializePaystackOrderPayment({ order });
};

const initializePaystackOrderPayment = async ({ order }) => {
  const email = order.user?.email || order.customerEmail;

  if (!email) {
    throw new BadRequestError("Customer email not found");
  }

  const reference = paystack.generateReference("KPX-ORDER");

  const init = await paystack.initializeTransaction({
    email,
    amount: order.totalAmount,
    reference,
    metadata: {
      type: "ORDER_PAYMENT",
      orderId: order.id,
      userId: order.userId,
    },
  });

  return paymentDb.createPayment({
    orderId: order.id,
    paymentType: "ORDER_PAYMENT",
    provider: PAYMENT_PROVIDER,
    reference,
    providerReference: null,
    amount: order.totalAmount,
    currency: "NGN",
    status: "PENDING",
    authorizationUrl: init.authorization_url,
    accessCode: init.access_code,
    providerPayload: init.raw,
  });
};

export const verifyPayment = async (reference) => {
  const payment = await paymentDb.findPaymentByReference(reference);

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  if (payment.paymentType === "INSTALLMENT_PAYMENT") {
    return verifyInstallmentPayment(reference);
  }

  return verifyPaystackPayment(reference);
};

const verifyInstallmentPayment = async (reference) => {
  const verification = await paystack.verifyTransaction(reference);

  const payment = await paymentDb.findPaymentByReference(reference);

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  assertPaymentAmount({
    providerAmount: verification.amount,
    expectedAmount: payment.amount,
    reference,
  });

  if (verification.status !== "SUCCESS") {
    if (isFinalPaymentStatus(payment.status)) {
      return payment;
    }

    return paymentDb.updatePaymentByReference(reference, {
      status: verification.status,
      providerPayload: verification.raw,
    });
  }

  return installmentService.processSuccessfulPayment({
    reference,
    providerPayload: verification.raw,
  });
};

const verifyPaystackPayment = async (reference) => {
  const verification = await paystack.verifyTransaction(reference);

  const result = await prisma.$transaction(async (tx) => {
    const payment = await paymentDb.findPaymentByReference(reference, tx);

    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    assertPaymentAmount({
      providerAmount: verification.amount,
      expectedAmount: payment.amount,
      reference,
    });

    /*
     * A payment can already be SUCCESS while the downstream
     * order confirmation was interrupted.
     *
     * Therefore SUCCESS does NOT mean we can immediately return.
     */
    if (payment.status === "SUCCESS") {
      const reconciled = await reconcileSuccessfulOrderPayment(payment, tx);

      return {
        payment: reconciled.payment,
        orderConfirmed: reconciled.orderConfirmed,
      };
    }

    if (isFinalPaymentStatus(payment.status)) {
      return {
        payment,
        orderConfirmed: false,
      };
    }

    const updatedPayment = await paymentDb.updatePaymentByReference(
      reference,
      {
        status: verification.status,
        providerPayload: verification.raw,
      },
      tx,
    );

    if (verification.status !== "SUCCESS") {
      return {
        payment: updatedPayment,
        orderConfirmed: false,
      };
    }

    return reconcileSuccessfulOrderPayment(updatedPayment, tx);
  });

  if (result.orderConfirmed) {
    await queueOrderPaymentConfirmed({
      payment: result.payment,
    });
  }

  return result.payment;
};

const reconcileSuccessfulOrderPayment = async (payment, tx) => {
  if (payment.paymentType !== "ORDER_PAYMENT") {
    return {
      payment,
      orderConfirmed: false,
    };
  }

  if (!payment.orderId) {
    return {
      payment,
      orderConfirmed: false,
    };
  }

  const order = await tx.order.findUnique({
    where: {
      id: payment.orderId,
    },
  });

  if (!order) {
    return {
      payment,
      orderConfirmed: false,
    };
  }

  if (order.status === "PENDING") {
    const confirmedOrder = await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: "CONFIRMED",
      },
    });

    return {
      payment: {
        ...payment,
        order: confirmedOrder,
      },
      orderConfirmed: true,
    };
  }

  /*
   * Already confirmed means the payment has been successfully
   * reconciled. Do nothing.
   */
  if (
    order.status === "CONFIRMED" ||
    order.status === "PROCESSING" ||
    order.status === "SHIPPED" ||
    order.status === "DELIVERED" ||
    order.status === "COMPLETED"
  ) {
    return {
      payment: {
        ...payment,
        order,
      },
      orderConfirmed: false,
    };
  }

  /*
   * Cancelled orders must not be resurrected by a payment
   * verification request.
   */
  return {
    payment: {
      ...payment,
      order,
    },
    orderConfirmed: false,
  };
};

export const handleWebhook = async (event) => {
  if (!event?.event) {
    return;
  }

  if (event.event !== "charge.success") {
    return;
  }

  const reference = event.data?.reference;

  if (!reference) {
    return;
  }

  const payment = await paymentDb.findPaymentByReference(reference);

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  if (payment.paymentType === "INSTALLMENT_PAYMENT") {
    return installmentService.processSuccessfulPayment({
      reference,
      providerPayload: event,
    });
  }

  const providerAmount = Number(event.data?.amount) / 100;

  assertPaymentAmount({
    providerAmount,
    expectedAmount: payment.amount,
    reference,
  });

  const result = await prisma.$transaction(async (tx) => {
    const currentPayment = await paymentDb.findPaymentByReference(
      reference,
      tx,
    );

    if (!currentPayment) {
      return {
        payment: null,
        orderConfirmed: false,
      };
    }

    if (currentPayment.status === "SUCCESS") {
      return reconcileSuccessfulOrderPayment(currentPayment, tx);
    }

    if (isFinalPaymentStatus(currentPayment.status)) {
      return {
        payment: currentPayment,
        orderConfirmed: false,
      };
    }

    const updatedPayment = await paymentDb.updatePaymentByReference(
      reference,
      {
        status: "SUCCESS",
        providerPayload: event,
      },
      tx,
    );

    return reconcileSuccessfulOrderPayment(updatedPayment, tx);
  });

  if (result.orderConfirmed) {
    await queueOrderPaymentConfirmed({
      payment: result.payment,
    });
  }

  return result.payment;
};

const queueOrderPaymentConfirmed = async ({ payment }) => {
  if (!payment?.orderId) {
    return;
  }

  const jobId = `order-payment-confirmed-${payment.orderId}`;

  try {
    const job = await orderQueue.add(
      "ORDER_PAYMENT_CONFIRMED",
      {
        orderId: payment.orderId,
        paymentId: payment.id,
        reference: payment.reference,
        userId: payment.order?.userId ?? null,
      },
      {
        jobId,
      },
    );

    console.log("[PAYMENT] Order payment confirmation queued:", {
      jobId: job.id,
      orderId: payment.orderId,
      reference: payment.reference,
    });

    return job;
  } catch (error) {
    console.error("[PAYMENT] Failed to queue order payment confirmation:", {
      orderId: payment.orderId,
      reference: payment.reference,
      error,
    });

    return null;
  }
};
