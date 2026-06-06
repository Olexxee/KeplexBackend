import express from "express";
import * as controller from "./payment.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// ORDER PAYMENT — POST /payments/order/:orderId/init
router.post(
  "/order/:orderId/init",
  authMiddleware,
  controller.initializePayment,
);

router.post(
  "/registration/:registrationId/init",
  controller.initializeRegistrationPayment,
);

// VERIFY — GET /payments/verify/:reference
// Called by Paystack redirect and the frontend callback page
router.get(
  "/verify/:reference",
  authMiddleware,
  controller.verifyPayment,
);

export default router;