export const registrationConfirmedTemplate = ({ registration }) => ({
  subject: "Keplex Training Registration Confirmed",
  html: `
    <h2>Registration Confirmed</h2>
    <p>Hello ${registration.fullName},</p>
    <p>Your payment of ₦${registration.amount} was successful.</p>
    <p>You are now registered for the training program.</p>
    <p><a href="https://t.me/YourGroupLinkHere">Join the Telegram Group</a></p>
  `,
});
