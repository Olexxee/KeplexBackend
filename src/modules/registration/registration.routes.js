import express from "express";
import * as registrationController from "./registrationController.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";

const registrationRouter = express.Router();

// ─────────────────────────────────────────
// PUBLIC
// creates registration + initializes payment in one shot
// returns { registration, payment: { reference, authorizationUrl } }
// ─────────────────────────────────────────
registrationRouter.post("/", registrationController.createRegistration);

// ─────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────
registrationRouter.get(
  "/",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  registrationController.getRegistrations,
);

registrationRouter.get(
  "/stats",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  registrationController.getRegistrationStats,
);

registrationRouter.get(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  registrationController.getRegistrationById,
);

registrationRouter.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  registrationController.updateRegistrationStatus,
);

export default registrationRouter;
