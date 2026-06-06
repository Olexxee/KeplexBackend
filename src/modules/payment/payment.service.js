import * as paystack from "./paymentGateway/paystack.js";
import * as paymentDb from "./payment.db.js";
import { NotFoundError, BadRequestError } from "../../classes/errorClasses.js";
import * as registrationDb from "../registration/registration.db.js";
import { prisma } from "../../config/prisma.js";

// ─────────────────────────────────────────
// ORDER PAYMENT
// ─────────────────────────────────────────

export const initializePayment = async ({ order, user }) => {
  const isOwner = order.userId === user.id;
  const isAdmin = ["SUPER_ADMIN", "ADMIN", "STAFF"].includes(user.role);

  if (!isOwner && !isAdmin) {
    throw new NotFoundError("Order not found");
  }

  if (order.status !== "PENDING") {
    throw new BadRequestError("Only pending orders can be paid for");
  }

  const existing = order.payments?.find((p) => p.status === "PENDING");
  if (existing?.authorizationUrl) return existing;

  const email = order.user?.email;

  if (!email) {
    throw new BadRequestError("Customer email not found");
  }
  
  if (!email) throw new BadRequestError("Missing customer email");

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

// ─────────────────────────────────────────
// REGISTRATION PAYMENT
// ─────────────────────────────────────────

export const initializeRegistrationPayment = async ({ registrationId }) => {
  const registration =
    await registrationDb.findRegistrationById(registrationId);

  if (!registration) {
    throw new NotFoundError("Registration not found");
  }

  if (registration.status === "PAID") {
    throw new BadRequestError("Registration already paid");
  }

  // price lives on the training program, not the enrollment
  const amount = registration.trainingProgram.price;
  const email = registration.email;
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

  // create a unified Payment row so verify logic stays in one place
  await paymentDb.createPayment({
    paymentType: "TRAINING_REGISTRATION",
    provider: "PAYSTACK",
    reference,
    amount,
    currency: "NGN",
    status: "PENDING",
    authorizationUrl: init.authorization_url,
    accessCode: init.access_code,
    providerPayload: init.raw,
    metadata: {
      type: "TRAINING_REGISTRATION",
      registrationId: registration.id,
      trainingProgramId: registration.trainingProgramId,
    },
  });

  // also stamp the reference on the enrollment for easy lookup
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

// ─────────────────────────────────────────
// UNIFIED VERIFY — works for all payment types
// ─────────────────────────────────────────

export const verifyPayment = async (reference) => {
  const payment = await paymentDb.findPaymentByReference(reference);

  if (!payment) throw new NotFoundError("Payment not found");

  // already settled — return early, don't re-verify
  if (["SUCCESS", "FAILED", "REVERSED"].includes(payment.status)) {
    return payment;
  }

  const verification = await paystack.verifyTransaction(reference);

  const updated = await paymentDb.updatePaymentByReference(reference, {
    status: verification.status,
    providerPayload: verification.raw,
  });

  if (verification.status !== "SUCCESS") return updated;

  // post-success side effects per payment type
  const type = payment.metadata?.type ?? payment.paymentType;

  if (type === "ORDER_PAYMENT" && updated.order?.status === "PENDING") {
    await paymentDb.markOrderConfirmed(updated.orderId);
  }

  if (type === "TRAINING_REGISTRATION") {
    const registrationId = payment.metadata?.registrationId;
    if (registrationId) {
      await registrationDb.updateRegistrationById(registrationId, {
        status: "PAID",
        paidAt: new Date(),
      });
    }
  }

  return updated;
};

// ─────────────────────────────────────────
// WEBHOOK — idempotent, handles all types
// ─────────────────────────────────────────

export const handleWebhook = async (event) => {
  if (event?.event !== "charge.success") return;

  const reference = event.data?.reference;
  if (!reference) return;

  const payment = await paymentDb.findPaymentByReference(reference);

  // unknown reference or already processed
  if (!payment) return;
  if (payment.status === "SUCCESS") return;

  const status = paystack.mapStatus(event.data.status);
  const type = payment.metadata?.type ?? payment.paymentType;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { reference },
      data: {
        status,
        providerPayload: event,
      },
      include: { order: true },
    });

    if (status !== "SUCCESS") return;

    if (type === "ORDER_PAYMENT" && updated.order?.status === "PENDING") {
      await tx.order.update({
        where: { id: updated.orderId },
        data: { status: "CONFIRMED" },
      });
    }

    if (type === "TRAINING_REGISTRATION") {
      const registrationId = payment.metadata?.registrationId;
      if (registrationId) {
        await tx.trainingEnrollment.update({
          where: { id: registrationId },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
        });
      }
    }
  });
};
