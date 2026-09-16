import * as paystack from "./paymentGateway/paystack.js";
import * as paymentDb from "./payment.db.js";
import { NotFoundError, BadRequestError } from "../../classes/errorClasses.js";
import * as registrationDb from "../registration/registration.db.js";
import { prisma } from "../../config/prisma.js";
import { orderQueue } from "../../jobs/queues/order.queue.js";

// ============================================================
// ORDER PAYMENT
// ============================================================

export const initializePayment = async ({ order, user }) => {
  if (!order) {
    throw new NotFoundError("Order not found");
  }

  const isOwner = order.userId === user.id;
  const isAdmin = ["SUPER_ADMIN", "ADMIN", "STAFF"].includes(user.role);

  if (!isOwner && !isAdmin) {
    throw new NotFoundError("Order not found");
  }

  if (order.status !== "PENDING") {
    throw new BadRequestError("Only pending orders can be paid for");
  }

  const existing = order.payments?.find(
    (payment) => payment.status === "PENDING" && payment.authorizationUrl,
  );

  if (existing) {
    return existing;
  }

  const email = order.user?.email;

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
    provider: "PAYSTACK",
    reference,
    amount: order.totalAmount,
    currency: "NGN",
    status: "PENDING",
    authorizationUrl: init.authorization_url,
    accessCode: init.access_code,
    providerPayload: init.raw,
  });
};

// ============================================================
// REGISTRATION PAYMENT
// ============================================================

export const initializeRegistrationPayment = async ({ registrationId }) => {
  const registration =
    await registrationDb.findRegistrationById(registrationId);

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
    provider: "PAYSTACK",
    reference,
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

  if (["SUCCESS", "FAILED", "REVERSED"].includes(payment.status)) {
    return payment;
  }

  const verification = await paystack.verifyTransaction(reference);

  const status = verification.status;

  const result = await prisma.$transaction(async (tx) => {
    const currentPayment = await tx.payment.findUnique({
      where: { reference },
      include: {
        order: true,
      },
    });

    if (!currentPayment) {
      throw new NotFoundError("Payment not found");
    }

    if (["SUCCESS", "FAILED", "REVERSED"].includes(currentPayment.status)) {
      return {
        payment: currentPayment,
        orderConfirmed: false,
      };
    }

    const updatedPayment = await tx.payment.update({
      where: { reference },
      data: {
        status,
        providerPayload: verification.raw,
      },
      include: {
        order: true,
      },
    });

    if (status !== "SUCCESS") {
      return {
        payment: updatedPayment,
        orderConfirmed: false,
      };
    }

    if (
      currentPayment.paymentType === "ORDER_PAYMENT" &&
      updatedPayment.order?.status === "PENDING"
    ) {
      await tx.order.update({
        where: {
          id: updatedPayment.orderId,
        },
        data: {
          status: "CONFIRMED",
        },
      });

      return {
        payment: updatedPayment,
        orderConfirmed: true,
      };
    }

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
    }

    return {
      payment: updatedPayment,
      orderConfirmed: false,
    };
  });

  if (result.orderConfirmed) {
    await queueOrderPaymentConfirmed({
      payment: result.payment,
    });
  }

  return result.payment;
};

// ============================================================
// PAYSTACK WEBHOOK
// ============================================================

export const handleWebhook = async (event) => {
  if (!event?.event) {
    return;
  }

  /*
   * We only process charge.success here.
   *
   * Other Paystack events can be added later without
   * changing the webhook controller.
   */
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

  /*
   * Fast idempotency check.
   *
   * The transaction below performs the authoritative
   * database check again because two identical webhooks
   * can theoretically arrive at the same time.
   */
  if (payment.status === "SUCCESS") {
    return;
  }

  const status = paystack.mapStatus(event.data?.status);

  const result = await prisma.$transaction(async (tx) => {
    const currentPayment = await tx.payment.findUnique({
      where: {
        reference,
      },
      include: {
        order: true,
      },
    });

    if (!currentPayment) {
      return {
        payment: null,
        orderConfirmed: false,
      };
    }

    /*
     * Authoritative idempotency check.
     */
    if (currentPayment.status === "SUCCESS") {
      return {
        payment: currentPayment,
        orderConfirmed: false,
      };
    }

    const updatedPayment = await tx.payment.update({
      where: {
        reference,
      },
      data: {
        status,
        providerPayload: event,
      },
      include: {
        order: true,
      },
    });

    if (status !== "SUCCESS") {
      return {
        payment: updatedPayment,
        orderConfirmed: false,
      };
    }

    /*
     * ORDER PAYMENT
     */
    if (
      currentPayment.paymentType === "ORDER_PAYMENT" &&
      updatedPayment.order?.status === "PENDING"
    ) {
      await tx.order.update({
        where: {
          id: updatedPayment.orderId,
        },
        data: {
          status: "CONFIRMED",
        },
      });

      return {
        payment: updatedPayment,
        orderConfirmed: true,
      };
    }

    /*
     * TRAINING REGISTRATION
     */
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
    }

    return {
      payment: updatedPayment,
      orderConfirmed: false,
    };
  });

  /*
   * IMPORTANT:
   *
   * This happens AFTER the payment/order transaction
   * has committed.
   *
   * Fulfillment is therefore never created inside
   * the Paystack database transaction.
   */
  if (result.orderConfirmed) {
    await queueOrderPaymentConfirmed({
      payment: result.payment,
    });
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
    /*
     * Payment and order confirmation have already committed.
     *
     * Do not convert a successful payment into a failed
     * webhook response simply because Redis is temporarily
     * unavailable.
     */
    console.error("[PAYMENT] Failed to queue order payment confirmation:", {
      orderId: payment.orderId,
      reference: payment.reference,
      error,
    });

    return null;
  }
};
