import { env } from "../../config/env.js";
import { mailer } from "../../config/mailer.js";

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) return;

  return mailer.sendMail({
    from: env.email.from,
    to,
    subject,
    html,
    text,
  });
};

export const sendOrderConfirmedEmail = async ({ order }) => {
  return sendEmail({
    to: order.customerEmail,
    subject: `Your order ${order.id} has been confirmed`,
    text: `Hello ${order.customerName}, your order has been confirmed.`,
    html: `
      <h2>Order Confirmed</h2>
      <p>Hello ${order.customerName},</p>
      <p>Your order has been confirmed.</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Total:</strong> ₦${order.totalAmount}</p>
    `,
  });
};

export const sendOrderStatusEmail = async ({ order }) => {
  return sendEmail({
    to: order.customerEmail,
    subject: `Order status updated: ${order.status}`,
    text: `Your order status is now ${order.status}.`,
    html: `
      <h2>Order Update</h2>
      <p>Hello ${order.customerName},</p>
      <p>Your order status is now <strong>${order.status}</strong>.</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
    `,
  });
};
