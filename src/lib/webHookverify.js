import crypto from "crypto";

export const verifyWebhookSignature = (rawBody, signature) => {
  const hash = crypto
    .createHmac("sha512", env.paystack.secretKey)
    .update(JSON.stringify(rawBody))
    .digest("hex");

  return hash === signature;
};
