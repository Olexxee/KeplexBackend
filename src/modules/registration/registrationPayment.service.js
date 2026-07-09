import { NotFoundError } from "../../classes/errorClasses.js";
import * as paystack from "../payment/paymentGateway/paystack.js";
import * as registrationDb from "./registration.db.js";

export const initializeRegistrationPayment = async (registrationId) => {
  const registration =
    await registrationDb.findRegistrationById(registrationId);

  if (!registration) {
    throw new NotFoundError("Registration not found");
  }

  const reference = paystack.generateReference("KPX-REG");

  const init = await paystack.initializeTransaction({
    email: registration.email,
    amount: registration.amount,
    reference,
    metadata: {
      registrationId: registration.id,
      trainingProgramId: registration.trainingProgramId,
    },
  });

  await registrationDb.updateRegistrationById(registration.id, {
    paymentRef: reference,
    authorizationUrl: init.authorization_url,
    accessCode: init.access_code,
    providerPayload: init.raw,
  });

  return {
    reference,
    authorizationUrl: init.authorization_url,
    accessCode: init.access_code,
  };
};

export const handleRegistrationPaymentSuccess = async (event) => {
  if (event?.event !== "charge.success") {
    return false;
  }

  const reference = event?.data?.reference;

  if (!reference) {
    return false;
  }

  const registration =
    await registrationDb.findRegistrationByPaymentRef(reference);

  if (!registration) {
    return false;
  }

  if (registration.status === "PAID") {
    return true;
  }

  await registrationDb.updateRegistrationById(registration.id, {
    status: "PAID",
    paidAt: new Date(),
    providerPayload: event,
  });

  return true;
};
