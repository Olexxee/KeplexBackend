import { asyncWrapper } from "../lib/asyncWrapper.js";
import { successResponse } from "../lib/response.js";
import { verifyWebhookSignature } from "../lib/webHookverify.js";
import * as webhookService from "./webhook.service.js";



export const paystackWebhook = asyncWrapper(async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  if (!signature) {
    return res.status(401).send("Missing signature");
  }

  if (!Buffer.isBuffer(req.body)) {
    console.error("[PAYSTACK WEBHOOK] Expected raw request body Buffer");
    return res.status(400).send("Invalid webhook body");
  }
  const valid = verifyWebhookSignature(req.body, signature);

  if (!valid) {
    return res.status(401).send("Invalid signature");
  }

  let event;

  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).send("Invalid JSON payload");
  }

  await webhookService.handlePaystackWebhook(event);

  return successResponse({
    res,
    message: "Webhook received",
  });
});
