export const orderConfirmedTemplate = ({ order }) => ({
  subject: `Order ${order.id} Confirmed`,
  html: `
    <h2>Order Confirmed</h2>
    <p>Hello ${order.customerName},</p>
    <p>Your order has been confirmed and is being processed.</p>
    <p><strong>Order ID:</strong> ${order.id}</p>
    <p><strong>Total:</strong> ₦${order.totalAmount}</p>
  `,
});

export const orderStatusTemplate = ({ order }) => ({
  subject: `Order Update: ${order.status}`,
  html: `
    <h2>Order Status Updated</h2>
    <p>Hello ${order.customerName},</p>
    <p>Your order status has changed to <strong>${order.status}</strong>.</p>
    <p><strong>Order ID:</strong> ${order.id}</p>
  `,
});
