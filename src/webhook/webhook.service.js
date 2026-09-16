import * as paymentService from "../modules/payment/payment.service.js";

export const handlePaystackWebhook = async (event) => {
  return paymentService.handleWebhook(event);
};
