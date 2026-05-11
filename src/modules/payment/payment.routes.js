import { Router } from "express";
import express from "express";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import * as paymentController from "./payment.controller.js";
import { handlePaystackWebhook } from "./paystackWebhook.controller.js";

const paymentRouter = Router();


paymentRouter.use(authMiddleware);

paymentRouter.post(
  "/orders/:orderId/initialize",
  paymentController.initializePayment,
);

paymentRouter.get("/verify/:reference", paymentController.verifyPayment);

export default paymentRouter;
