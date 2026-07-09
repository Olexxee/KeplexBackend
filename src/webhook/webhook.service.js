import * as paymentService from "../modules/payment/payment.service.js";
import { handleRegistrationPaymentSuccess } from "../modules/registration/registrationPayment.service.js";  

export const handlePaystackWebhook = async (event) => {
  const registrationHandled = await handleRegistrationPaymentSuccess(event);

  if (registrationHandled) {
    return;
  }

  await paymentService.handleWebhook(event);
};
