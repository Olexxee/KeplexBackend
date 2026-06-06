import * as paymentDb from "../payment.db.js";

export const handleOrderPaymentSuccess = async (payment) => {
  const order = payment.order;

  if (!order) {
    return;
  }

  if (order.status !== "PENDING") {
    return;
  }

  await paymentDb.markOrderConfirmed(order.id);
};
