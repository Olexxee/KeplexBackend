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


// modules/notifications/templates/order.templates.js
export const orderCreatedTemplate = ({ order, user }) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">
        ${item.variant?.product?.name || 'Product'} 
        ${item.variant?.sku ? `(${item.variant.sku})` : ''}
        ${item.variant?.color ? ` - ${item.variant.color}` : ''}
        ${item.variant?.size ? ` - ${item.variant.size}` : ''}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₦${Number(item.unitPriceSnapshot).toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₦${Number(item.totalPrice).toFixed(2)}</td>
    </tr>
  `).join('');

  return {
    subject: `Order Confirmation - #${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1a1a2e; color: white; padding: 10px; text-align: left; }
          .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #e94560; color: white; 
                   text-decoration: none; border-radius: 4px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.fullName || 'Customer'},</h2>
            <p>Thank you for your order! We're excited to confirm that we've received it.</p>
            
            <div class="order-details">
              <h3>Order #${order.orderNumber}</h3>
              <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${order.status}</p>
              
              <h4>Items:</h4>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Price</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              <div class="total">
                <p><strong>Subtotal:</strong> ₦${Number(order.subtotal).toFixed(2)}</p>
                ${order.shippingCost > 0 ? `<p><strong>Shipping:</strong> ₦${Number(order.shippingCost).toFixed(2)}</p>` : ''}
                ${order.taxAmount > 0 ? `<p><strong>Tax:</strong> ₦${Number(order.taxAmount).toFixed(2)}</p>` : ''}
                <p style="font-size: 20px; color: #e94560;">
                  <strong>Total: ₦${Number(order.totalAmount).toFixed(2)}</strong>
                </p>
              </div>
            </div>

            <h4>Shipping Address:</h4>
            <p>
              ${order.customerName}<br>
              ${order.shippingStreet}<br>
              ${order.shippingCity}, ${order.shippingState || ''}<br>
              ${order.shippingCountry}
            </p>

            ${order.cbm ? `
              <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4>📦 Shipping Details:</h4>
                <p><strong>Total CBM:</strong> ${Number(order.cbm).toFixed(4)} m³</p>
                <p><strong>Chargeable Weight:</strong> ${Number(order.chargeableWeight).toFixed(2)} kg</p>
              </div>
            ` : ''}

            <a href="${process.env.FRONTEND_URL}/orders/${order.id}" class="button">View Order</a>
            <p>We'll send you another email when your order ships.</p>
            <p>Thanks for shopping with us!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Keplex. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

export const orderStatusUpdatedTemplate = ({ order, oldStatus, newStatus, user }) => {
  const statusMessages = {
    CONFIRMED: 'Your order has been confirmed and is being prepared.',
    PROCESSING: 'Your order is now being processed.',
    SHIPPED: 'Your order has been shipped! 🚚',
    DELIVERED: 'Your order has been delivered! 🎉',
    CANCELLED: 'Your order has been cancelled.',
  };

  return {
    subject: `Order ${newStatus} - #${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .status-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .status { font-size: 24px; font-weight: bold; color: #e94560; }
          .button { display: inline-block; padding: 12px 24px; background: #e94560; color: white; 
                   text-decoration: none; border-radius: 4px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Update</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.fullName || 'Customer'},</h2>
            <p>Your order status has been updated.</p>
            
            <div class="status-box">
              <p><strong>Order #${order.orderNumber}</strong></p>
              <p class="status">${newStatus}</p>
              <p>${statusMessages[newStatus] || 'Your order has been updated.'}</p>
            </div>

            ${newStatus === 'SHIPPED' ? `
              <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4>📦 Tracking Information</h4>
                ${order.fulfillments?.map(f => `
                  <p><strong>Carrier:</strong> ${f.carrier || 'Pending'}</p>
                  <p><strong>Tracking Number:</strong> ${f.trackingNumber || 'Pending'}</p>
                  ${f.trackingUrl ? `<a href="${f.trackingUrl}" target="_blank">Track Package</a>` : ''}
                `).join('') || 'Tracking information will be available soon.'}
              </div>
            ` : ''}

            <a href="${process.env.FRONTEND_URL}/orders/${order.id}" class="button">View Order</a>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Keplex. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

export const cbmUpdateTemplate = ({ order, cbmData, user }) => {
  const itemsHtml = cbmData.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.productName || 'Product'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.cbm} m³</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.chargeableWeight} kg</td>
    </tr>
  `).join('');

  return {
    subject: `Shipping Update - Order #${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .cbm-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1a1a2e; color: white; padding: 10px; text-align: left; }
          .total-box { background: #f0f7ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #e94560; color: white; 
                   text-decoration: none; border-radius: 4px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Shipping Measurement Update</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.fullName || 'Customer'},</h2>
            <p>Your order #${order.orderNumber} has been measured for shipping.</p>
            
            <div class="cbm-details">
              <h3>📦 CBM Calculation Details</h3>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: center;">CBM</th>
                    <th style="text-align: center;">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              <div class="total-box">
                <p><strong>Total CBM:</strong> ${Number(cbmData.totalCBM).toFixed(4)} m³</p>
                <p><strong>Total Chargeable Weight:</strong> ${Number(cbmData.totalChargeableWeight).toFixed(2)} kg</p>
              </div>
            </div>

            ${cbmData.additionalCharge && cbmData.additionalCharge > 0 ? `
              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
                <h3 style="color: #856404;">⚠️ Additional Charge Required</h3>
                <p style="font-size: 18px;"><strong>Additional Amount: ₦${Number(cbmData.additionalCharge).toFixed(2)}</strong></p>
                <p>Due to the size/weight of your items, an additional shipping charge is required.</p>
                <a href="${cbmData.paymentLink || '#'}" class="button" style="background: #ffc107; color: #333;">Pay Additional Charge</a>
              </div>
            ` : ''}

            <a href="${process.env.FRONTEND_URL}/orders/${order.id}" class="button">View Order</a>
            <p>If you have any questions, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Keplex. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};