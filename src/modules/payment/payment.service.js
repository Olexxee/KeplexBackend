import * as paystack from "./paymentGateway/paystack.js";
import * as pawapay from "./paymentGateway/pawapay.js";
import * as paymentDb from "./payment.db.js";

import {
  BadRequestError,
  NotFoundError,
} from "../../classes/errorClasses.js";

import * as registrationDb from "../registration/registration.db.js";
import { prisma } from "../../config/prisma.js";
import { orderQueue } from "../../jobs/queues/order.queue.js";

// ============================================================
// CONSTANTS
// ============================================================

const PAYMENT_PROVIDERS = {
  PAYSTACK: "PAYSTACK",
  PAWAPAY: "PAWAPAY",
};

const PAYMENT_FINAL_STATUSES = ["SUCCESS", "FAILED", "REVERSED"];
const PAWAPAY_CURRENCY = process.env.PAWAPAY_CURRENCY || "NGN";
const PAWAPAY_PROVIDER = process.env.PAWAPAY_PROVIDER || null;

const isFinalPaymentStatus = (status) =>
  PAYMENT_FINAL_STATUSES.includes(status);

// ============================================================
// ORDER PAYMENT
// ============================================================

export const initializePayment = async ({
  order,
  user,
  provider = PAYMENT_PROVIDERS.PAYSTACK,
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

  if (!Object.values(PAYMENT_PROVIDERS).includes(normalizedProvider)) {
    throw new BadRequestError(`Unsupported payment provider: ${provider}`);
  }

  const existing = order.payments?.find(
    (payment) =>
      payment.provider === normalizedProvider && payment.status === "PENDING",
  );

  if (existing) {
    return existing;
  }

  if (normalizedProvider === PAYMENT_PROVIDERS.PAWAPAY) {
    return initializePawaPayOrderPayment({ order, paymentData });
  }

  return initializePaystackOrderPayment({ order });
};

// ============================================================
// PAYSTACK ORDER PAYMENT
// ============================================================

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
    provider: PAYMENT_PROVIDERS.PAYSTACK,
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

// ============================================================
// PAWAPAY ORDER PAYMENT
// ============================================================

const initializePawaPayOrderPayment = async ({ order, paymentData }) => {
  const phoneNumber =
    paymentData.phoneNumber || order.customerPhone || order.user?.phone;

  const provider = paymentData.provider || PAWAPAY_PROVIDER;

  if (!phoneNumber) {
    throw new BadRequestError("Mobile money phone number is required");
  }

  if (!provider) {
    throw new BadRequestError("Mobile money provider is required");
  }

  const depositId = pawapay.generateDepositId();
  const reference = paystack.generateReference("KPX-ORDER");
  const customerMessage =
    paymentData.customerMessage || `Order ${order.orderNumber}`;

  if (customerMessage.length < 4 || customerMessage.length > 22) {
    throw new BadRequestError(
      "pawaPay customer message must be between 4 and 22 characters",
    );
  }

  const init = await pawapay.initializeDeposit({
    depositId,
    amount: order.totalAmount,
    currency: PAWAPAY_CURRENCY,
    phoneNumber,
    provider,
    clientReferenceId: reference,
    customerMessage,
    metadata: [
      { orderId: order.id },
      ...(order.userId ? [{ customerId: order.userId }] : []),
    ],
  });

  if (!["ACCEPTED", "DUPLICATE_IGNORED"].includes(init.status)) {
    throw new BadRequestError(
      init.rejectionReason?.rejectionMessage ||
        `pawaPay rejected the payment request with status ${init.status}`,
    );
  }

  return paymentDb.createPayment({
    orderId: order.id,
    paymentType: "ORDER_PAYMENT",
    provider: PAYMENT_PROVIDERS.PAWAPAY,
    reference,
    providerReference: depositId,
    amount: order.totalAmount,
    currency: PAWAPAY_CURRENCY,
    status: "PENDING",
    authorizationUrl: null,
    accessCode: null,
    providerPayload: init.raw,
  });
};

// ============================================================
// REGISTRATION PAYMENT
// ============================================================

export const initializeRegistrationPayment = async ({ registrationId }) => {
  const registration = await registrationDb.findRegistrationById(registrationId);

  if (!registration) {
    throw new NotFoundError("Registration not found");
  }

  if (registration.status === "PAID") {
    throw new BadRequestError("Registration already paid");
  }

  const amount = registration.trainingProgram.price;
  const email = registration.email;

  if (!email) {
    throw new BadRequestError("Registration customer email not found");
  }

  const reference = paystack.generateReference("KPX-REG");

  const init = await paystack.initializeTransaction({
    email,
    amount,
    reference,
    metadata: {
      type: "TRAINING_REGISTRATION",
      registrationId: registration.id,
      trainingProgramId: registration.trainingProgramId,
    },
  });

  await paymentDb.createPayment({
    trainingEnrollmentId: registration.id,
    paymentType: "TRAINING_REGISTRATION",
    provider: PAYMENT_PROVIDERS.PAYSTACK,
    reference,
    providerReference: null,
    amount,
    currency: "NGN",
    status: "PENDING",
    authorizationUrl: init.authorization_url,
    accessCode: init.access_code,
    providerPayload: init.raw,
  });

  await registrationDb.updateRegistrationById(registration.id, {
    paymentRef: reference,
    authorizationUrl: init.authorization_url,
    accessCode: init.access_code,
  });

  return {
    reference,
    authorizationUrl: init.authorization_url,
    accessCode: init.access_code,
  };
};

// ============================================================
// VERIFY PAYMENT
// ============================================================

export const verifyPayment = async (reference) => {
  const payment = await paymentDb.findPaymentByReference(reference);

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  if (isFinalPaymentStatus(payment.status)) {
    return payment;
  }

  if (payment.provider === PAYMENT_PROVIDERS.PAWAPAY) {
    return verifyPawaPayPayment(payment);
  }

  return verifyPaystackPayment(reference);
};

// ============================================================
// PAYSTACK VERIFICATION
// ============================================================

const verifyPaystackPayment = async (reference) => {
  const verification = await paystack.verifyTransaction(reference);
  const status = verification.status;

  const result = await prisma.$transaction(async (tx) => {
    const currentPayment = await paymentDb.findPaymentByReference(reference, tx);

    if (!currentPayment) {
      throw new NotFoundError("Payment not found");
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
        status,
        providerPayload: verification.raw,
      },
      tx,
    );

    if (status !== "SUCCESS") {
      return {
        payment: updatedPayment,
        orderConfirmed: false,
      };
    }

    const orderConfirmed = await confirmOrderPayment(updatedPayment, tx);

    return {
      payment: orderConfirmed.payment,
      orderConfirmed: orderConfirmed.orderConfirmed,
    };
  });

  if (result.orderConfirmed) {
    await queueOrderPaymentConfirmed({ payment: result.payment });
  }

  return result.payment;
};

// ============================================================
// PAWAPAY VERIFICATION
// ============================================================

const verifyPawaPayPayment = async (payment) => {
  if (!payment.providerReference) {
    throw new BadRequestError("pawaPay deposit reference is missing");
  }

  const verification = await pawapay.getDepositStatus(payment.providerReference);

  if (verification.status !== "FOUND") {
    throw new BadRequestError("pawaPay deposit could not be found");
  }

  const deposit = verification.data;

  if (!deposit) {
    throw new BadRequestError("pawaPay deposit details are missing");
  }

  const result = await applyPawaPayStatus(payment.providerReference, deposit);

  if (result.orderConfirmed) {
    await queueOrderPaymentConfirmed({ payment: result.payment });
  }

  return result.payment;
};

// ============================================================
// PAWAPAY CALLBACK
// ============================================================

export const handlePawaPayCallback = async (payload) => {
  const depositId = payload?.depositId;

  if (!depositId) {
    throw new BadRequestError("pawaPay callback depositId is required");
  }

  const verification = await pawapay.getDepositStatus(depositId);

  if (verification.status !== "FOUND") {
    throw new BadRequestError("pawaPay deposit could not be verified");
  }

  const deposit = verification.data;

  if (!deposit) {
    throw new BadRequestError("pawaPay deposit details are missing");
  }

  const payment = await paymentDb.findPaymentByProviderReference(depositId);

  if (!payment) {
    console.warn(`[PAWAPAY CALLBACK] Unknown deposit: ${depositId}`);
    return null;
  }

  if (
    deposit.clientReferenceId &&
    deposit.clientReferenceId !== payment.reference
  ) {
    throw new BadRequestError("pawaPay payment reference mismatch");
  }

  const result = await applyPawaPayStatus(depositId, deposit);

  if (result.orderConfirmed) {
    await queueOrderPaymentConfirmed({ payment: result.payment });
  }

  return result.payment;
};

// ============================================================
// APPLY PAWAPAY STATUS
// ============================================================

const applyPawaPayStatus = async (depositId, deposit) => {
  const normalizedStatus = normalizePawaPayStatus(deposit.status);

  return prisma.$transaction(async (tx) => {
    const currentPayment = await paymentDb.findPaymentByProviderReference(
      depositId,
      tx,
    );

    if (!currentPayment) {
      throw new NotFoundError("Payment not found");
    }

    if (isFinalPaymentStatus(currentPayment.status)) {
      return {
        payment: currentPayment,
        orderConfirmed: false,
      };
    }

    const updatedPayment = await paymentDb.updatePaymentByProviderReference(
      depositId,
      {
        status: normalizedStatus,
        providerPayload: deposit,
      },
      tx,
    );

    if (normalizedStatus !== "SUCCESS") {
      return {
        payment: updatedPayment,
        orderConfirmed: false,
      };
    }

    const orderConfirmed = await confirmOrderPayment(updatedPayment, tx);

    return {
      payment: orderConfirmed.payment,
      orderConfirmed: orderConfirmed.orderConfirmed,
    };
  });
};

// ============================================================
// STATUS NORMALIZATION
// ============================================================

const normalizePawaPayStatus = (status) => {
  switch (String(status).toUpperCase()) {
    case "COMPLETED":
      return "SUCCESS";
    case "FAILED":
      return "FAILED";
    default:
      return "PENDING";
  }
};

// ============================================================
// ORDER CONFIRMATION
// ============================================================

const confirmOrderPayment = async (payment, tx) => {
  if (payment.paymentType !== "ORDER_PAYMENT") {
    return {
      payment,
      orderConfirmed: false,
    };
  }

  if (!payment.orderId || payment.order?.status !== "PENDING") {
    return {
      payment,
      orderConfirmed: false,
    };
  }

  const order = await tx.order.update({
    where: {
      id: payment.orderId,
    },
    data: {
      status: "CONFIRMED",
    },
  });

  return {
    payment: {
      ...payment,
      order,
    },
    orderConfirmed: true,
  };
};

// ============================================================
// PAYSTACK WEBHOOK
// ============================================================

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
    console.warn(`[PAYSTACK WEBHOOK] Unknown payment reference: ${reference}`);
    return;
  }

  if (payment.status === "SUCCESS") {
    return;
  }

  const status = paystack.mapStatus(event.data?.status);

  const result = await prisma.$transaction(async (tx) => {
    const currentPayment = await paymentDb.findPaymentByReference(reference, tx);

    if (!currentPayment) {
      return {
        payment: null,
        orderConfirmed: false,
      };
    }

    if (currentPayment.status === "SUCCESS") {
      return {
        payment: currentPayment,
        orderConfirmed: false,
      };
    }

    const updatedPayment = await paymentDb.updatePaymentByReference(
      reference,
      {
        status,
        providerPayload: event,
      },
      tx,
    );

    if (status !== "SUCCESS") {
      return {
        payment: updatedPayment,
        orderConfirmed: false,
      };
    }

    const orderConfirmed = await confirmOrderPayment(updatedPayment, tx);

    if (currentPayment.paymentType === "TRAINING_REGISTRATION") {
      if (currentPayment.trainingEnrollmentId) {
        await tx.trainingEnrollment.update({
          where: {
            id: currentPayment.trainingEnrollmentId,
          },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
        });
      }

      return {
        payment: updatedPayment,
        orderConfirmed: false,
      };
    }

    return {
      payment: orderConfirmed.payment,
      orderConfirmed: orderConfirmed.orderConfirmed,
    };
  });

  if (result.orderConfirmed) {
    await queueOrderPaymentConfirmed({ payment: result.payment });
  }

  return result.payment;
};

// ============================================================
// ORDER PAYMENT → BACKGROUND PROCESSING
// ============================================================

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
      { jobId },
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
