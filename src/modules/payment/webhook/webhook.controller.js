import crypto from "crypto";
import { asyncWrapper } from "../../../lib/asyncWrapper.js";
import {successResponse} from "../../../lib/response.js";
import * as webhookService from "./webhook.service.js";

export const paystackWebhook = asyncWrapper(async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.headers["x-paystack-signature"];

  const hash = crypto
    .createHmac("sha512", secret)
    .update(req.body) // Buffer from express.raw()
    .digest("hex");

  if (hash !== signature) {
    return res.status(401).send("Invalid signature");
  }

  const event = JSON.parse(req.body.toString());

  await webhookService.handlePaystackWebhook(event);

  return successResponse({
    res,
    message: "Webhook received",
  });
});
