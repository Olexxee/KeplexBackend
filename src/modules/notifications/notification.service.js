import { env } from "../../config/env.js";
import { sendEmail } from "../../config/mailer.js";

export const sendOrderConfirmedEmail = async ({ order }) => {
  return sendEmail({
    to: order.customerEmail,
    subject: `Your order ${order.id} has been confirmed`,
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
    html: `
      <h2>Order Update</h2>
      <p>Hello ${order.customerName},</p>
      <p>Your order status is now <strong>${order.status}</strong>.</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
    `,
  });
};

export const sendRegistrationConfirmedEmail = async ({ registration }) => {
  return sendEmail({
    to: registration.email,
    subject: "Your Keplex training registration is confirmed",
    html: `
      <h2>Registration Confirmed</h2>
      <p>Hello ${registration.fullName},</p>
      <p>Your payment of ₦${registration.amount} was successful.</p>
      <p>You can now join the Telegram group:</p>
      <p><a href="https://t.me/YourGroupLinkHere">Join Telegram Group</a></p>
    `,
  });
};
