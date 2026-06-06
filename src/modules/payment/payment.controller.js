import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as paymentService from "./payment.service.js";
import {verifyWebhookSignature} from "../../lib/webHookverify.js";  
import * as orderDb from "../order/order.db.js";

// POST /payments/order/:orderId/init
export const initializePayment = asyncWrapper(async (req, res) => {
  const order = await orderDb.findOrderById(req.params.orderId);

  const payment = await paymentService.initializePayment({
    order,
    user: req.user,
  });

  return successResponse({
    res,
    statusCode: 201,
    message: "Payment initialized",
    data: payment,
  });
});

export const initializeRegistrationPayment = asyncWrapper(async (req, res) => {
  const payment = await paymentService.initializeRegistrationPayment({
    registrationId: req.params.registrationId,
  });

  return successResponse({
    res,
    message: "Payment initialized successfully",
    data: payment,
  });
});

// GET /payments/verify/:reference
export const verifyPayment = asyncWrapper(async (req, res) => {
  const payment = await paymentService.verifyPayment(req.params.reference);

  return successResponse({
    res,
    message: "Payment verified",
    data: payment,
  });
});

export const paystackWebhook = asyncWrapper(async (req, res) => {
  const signature = req.headers["x-paystack-signature"];

  const valid = verifyWebhookSignature(req.body, signature);

  if (!valid) {
    return res.status(401).send("Invalid signature");
  }

  await paymentService.handleWebhook(req.body);

  res.status(200).send("OK");
});