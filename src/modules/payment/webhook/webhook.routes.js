import express from "express";
import { paystackWebhook } from "./webhook.controller.js";

const webhookRouter = express.Router();

webhookRouter.post(
  "/webhook/paystack",
  express.raw({ type: "application/json" }),
  paystackWebhook,
);

export default webhookRouter;
