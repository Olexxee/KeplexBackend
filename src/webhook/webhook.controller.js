import crypto from "crypto";
import { asyncWrapper } from "../lib/asyncWrapper.js";
import { successResponse } from "../lib/response.js";
import * as webhookService from "./webhook.service.js";

export const paystackWebhook = asyncWrapper(async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.headers["x-paystack-signature"];

  if (!secret) {
    console.error("[PAYSTACK WEBHOOK] PAYSTACK_SECRET_KEY is missing");
    return res.status(500).send("Webhook configuration error");
  }

  if (!signature) {
    return res.status(401).send("Missing signature");
  }

  if (!Buffer.isBuffer(req.body)) {
    console.error("[PAYSTACK WEBHOOK] Expected raw request body Buffer");

    return res.status(400).send("Invalid webhook body");
  }

  const hash = crypto
    .createHmac("sha512", secret)
    .update(req.body)
    .digest("hex");

  if (hash !== signature) {
    return res.status(401).send("Invalid signature");
  }

  const event = JSON.parse(req.body.toString("utf8"));

  await webhookService.handlePaystackWebhook(event);

  return successResponse({
    res,
    message: "Webhook received",
  });
});
