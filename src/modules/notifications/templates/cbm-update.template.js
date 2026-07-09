// modules/notifications/templates/cbm-update.template.js

export const cbmUpdateTemplate = ({ order, cbmData, user }) => {
  return {
    subject: `Shipping Update for Order #${order.id}`,
    html: `
      <h1>Hello ${user.fullName},</h1>
      <p>Your order #${order.id} has been measured for shipping.</p>
      
      <h3>Shipping Details:</h3>
      <ul>
        <li>Total CBM: ${cbmData.totalCBM} m³</li>
        <li>Chargeable Weight: ${cbmData.chargeableWeight} kg</li>
        <li>Shipping Cost: ₦${cbmData.shippingCost}</li>
      </ul>
      
      <h3>Item Breakdown:</h3>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>CBM</th>
            <th>Weight</th>
          </tr>
        </thead>
        <tbody>
          ${cbmData.itemBreakdown
            .map(
              (item) => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>${item.cbm} m³</td>
              <td>${item.weight} kg</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      
      ${
        cbmData.additionalCharge > 0
          ? `
        <p><strong>Additional Charge: ₦${cbmData.additionalCharge}</strong></p>
        <a href="${cbmData.paymentLink}" style="...">Pay Now</a>
      `
          : ""
      }
      
      <p>Track your shipment: ${cbmData.trackingLink}</p>
    `,
  };
};
