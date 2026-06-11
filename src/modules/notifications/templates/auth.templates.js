export const welcomeTemplate = ({ user }) => ({
  subject: "Welcome to Keplex!",
  html: `
    <h2>Welcome, ${user.fullName}!</h2>
    <p>Your account has been created successfully.</p>
    <p>Start shopping or explore our training programs.</p>
  `,
});

export const passwordChangedTemplate = ({ user }) => ({
  subject: "Your password has been changed",
  html: `
    <h2>Password Changed</h2>
    <p>Hello ${user.fullName},</p>
    <p>Your Keplex account password was recently changed.</p>
    <p>If you did not make this change, please contact support immediately.</p>
  `,
});
