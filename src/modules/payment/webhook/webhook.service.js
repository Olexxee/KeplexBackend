import * as paymentService from "../payment.service.js";

export const handlePaystackWebhook = async (event) => {
  await paymentService.handleWebhook(event);
};
