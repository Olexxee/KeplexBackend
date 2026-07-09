import express from "express";
import * as registrationController from "./registrationController.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";

const registrationRouter = express.Router();

// ─────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────

// POST /registrations
// Creates registration + initializes Paystack payment in one shot
// Returns { registration, payment: { reference, authorizationUrl } }
registrationRouter.post("/", registrationController.createRegistration);

// GET /registrations/verify/:reference
// Unauthenticated — used for post-payment redirect confirmation
registrationRouter.get(
  "/verify/:reference",
  registrationController.verifyRegistrationPayment,
);

// ─────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────

// GET /registrations
registrationRouter.get(
  "/",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  registrationController.getRegistrations,
);

// GET /registrations/stats
registrationRouter.get(
  "/stats",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  registrationController.getRegistrationStats,
);

// GET /registrations/:id
registrationRouter.get(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  registrationController.getRegistrationById,
);

// PATCH /registrations/:id/status
registrationRouter.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  registrationController.updateRegistrationStatus,
);

export default registrationRouter;
