import express from "express";
import * as controller from "./payment.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../middlewares/validateMiddleware.js";
import { initializeOrderPaymentSchema } from "./payment.validation.js";

const router = express.Router();

// ============================================================
// PAWAPAY CALLBACK
// ============================================================
//
// This must NOT use authMiddleware.
// pawaPay calls this endpoint directly.
//
// POST /payments/pawapay/callback
//
router.post("/pawapay/callback", controller.pawapayCallback);

// ============================================================
// ORDER PAYMENT
// ============================================================

// POST /payments/order/:orderId/init
router.post(
  "/order/:orderId/init",
  authMiddleware,
  validateBody(initializeOrderPaymentSchema),
  controller.initializePayment,
);

// ============================================================
// TRAINING REGISTRATION PAYMENT
// ============================================================

router.post(
  "/registration/:registrationId/init",
  controller.initializeRegistrationPayment,
);

// ============================================================
// VERIFY
// ============================================================

// GET /payments/verify/:reference
router.get("/verify/:reference", controller.verifyPayment);

export default router;
