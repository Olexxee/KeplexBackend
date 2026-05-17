import axios from "axios";

import { env } from "../../config/env.js";
import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";
import { enqueueNotification } from "../../queues/notification.queue.js";
import * as registrationDb from "./registration.db.js";

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const TRAINING_AMOUNT = 5000;
const FINAL_REGISTRATION_STATUSES = ["PAID", "CANCELLED", "EXPIRED"];

const toKobo = (amount) => Math.round(Number(amount) * 100);

const generateReference = (registrationId) => {
  return `KPX-REG-${registrationId}-${Date.now()}`;
};

const normalizeRegistrationStatus = (status) => {
  if (!status) return null;

  return String(status).trim().toUpperCase();
};

const assertValidManualStatus = (status) => {
  const allowedStatuses = ["CANCELLED", "EXPIRED"];

  if (!allowedStatuses.includes(status)) {
    throw new BadRequestError(
      "Only CANCELLED or EXPIRED can be set manually",
    );
  }
};

export const createRegistrationPayment = async ({
  fullName,
  email,
  phone,
}) => {
  if (!fullName || !email || !phone) {
    throw new BadRequestError("Full name, email and phone are required");
  }

  const registration = await registrationDb.createRegistration({
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    amount: TRAINING_AMOUNT,
    currency: "NGN",
    status: "PENDING",
    provider: "PAYSTACK",
  });

  const reference = generateReference(registration.id);

  const response = await axios.post(
    `${PAYSTACK_BASE_URL}/transaction/initialize`,
    {
      email: registration.email,
      amount: toKobo(TRAINING_AMOUNT),
      reference,
      callback_url: env.paystack.callbackUrl,
      currency: "NGN",
      metadata: {
        type: "TRAINING_REGISTRATION",
        registrationId: registration.id,
        fullName: registration.fullName,
        phone: registration.phone,
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
    throw new BadRequestError("Unable to initialize registration payment");
  }

  const updatedRegistration = await registrationDb.updateRegistrationById(
    registration.id,
    {
      paymentRef: reference,
      authorizationUrl: paystackData.authorization_url,
      accessCode: paystackData.access_code,
      providerPayload: response.data,
    },
  );

  return {
    registrationId: updatedRegistration.id,
    reference: updatedRegistration.paymentRef,
    authorizationUrl: updatedRegistration.authorizationUrl,
    accessCode: updatedRegistration.accessCode,
  };
};

export const verifyRegistrationPayment = async (reference) => {
  const registration =
    await registrationDb.findRegistrationByPaymentRef(reference);

  if (!registration) {
    throw new NotFoundError("Registration payment not found");
  }

  if (FINAL_REGISTRATION_STATUSES.includes(registration.status)) {
    return registration;
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
    throw new BadRequestError("Unable to verify registration payment");
  }

  if (paystackData.status !== "success") {
    return registrationDb.updateRegistrationById(registration.id, {
      providerPayload: response.data,
    });
  }

  const paidRegistration = await registrationDb.updateRegistrationById(
    registration.id,
    {
      status: "PAID",
      paidAt: new Date(),
      providerPayload: response.data,
    },
  );

  await enqueueNotification("REGISTRATION_CONFIRMED", {
    registration: paidRegistration,
  });

  return paidRegistration;
};

export const getRegistrations = async (query) => {
  return registrationDb.listRegistrations(query);
};

export const getRegistrationById = async (id) => {
  const registration = await registrationDb.findRegistrationById(id);

  if (!registration) {
    throw new NotFoundError("Registration not found");
  }

  return registration;
};

export const getRegistrationStats = async () => {
  return registrationDb.getRegistrationStats();
};

export const updateRegistrationStatus = async ({ id, status }) => {
  const normalizedStatus = normalizeRegistrationStatus(status);

  assertValidManualStatus(normalizedStatus);

  const registration = await registrationDb.findRegistrationById(id);

  if (!registration) {
    throw new NotFoundError("Registration not found");
  }

  if (registration.status === "PAID") {
    throw new BadRequestError("Paid registrations cannot be manually changed");
  }

  return registrationDb.updateRegistrationById(id, {
    status: normalizedStatus,
    ...(normalizedStatus === "CANCELLED" ? { cancelledAt: new Date() } : {}),
  });
};