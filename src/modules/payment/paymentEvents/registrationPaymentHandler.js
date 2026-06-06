import * as registrationDb from "../../registrations/registration.db.js";

export const handleRegistrationPaymentSuccess = async (payment, metadata) => {
  const registrationId = metadata.registrationId;

  if (!registrationId) {
    return;
  }

  const registration =
    await registrationDb.findRegistrationById(registrationId);

  if (!registration) {
    return;
  }

  if (registration.status === "PAID") {
    return;
  }

  await registrationDb.updateRegistrationById(registrationId, {
    status: "PAID",
    paidAt: new Date(),
  });
};
