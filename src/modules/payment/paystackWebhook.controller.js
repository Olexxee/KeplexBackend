import crypto from "crypto";

import { env } from "../../config/env.js";
import * as paymentService from "./payment.service.js";

const isValidPaystackSignature = (rawBody, signature) => {
  if (!signature) return false;

  const hash = crypto
    .createHmac("sha512", env.paystack.webhookSecret)
    .update(rawBody)
    .digest("hex");

  return hash === signature;
};

export const handlePaystackWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];

    const isValid = isValidPaystackSignature(req.body, signature);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const event = JSON.parse(req.body.toString("utf8"));

    const reference = event?.data?.reference;

    if (!reference) {
      return res.status(200).json({
        success: true,
        message: "Webhook ignored: missing reference",
      });
    }

    await paymentService.verifyPayment(reference);

    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Paystack webhook error:", error);

    return res.status(200).json({
      success: true,
      message: "Webhook received",
    });
  }
};
