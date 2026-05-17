import express from "express";
import * as registrationController from "./registrationController.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";

const router = express.Router();

router.post("/initialize", registrationController.initializeRegistration);

router.get("/verify/:reference", registrationController.verifyRegistration);

router.get(
  "/admin",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  registrationController.getRegistrations,
);

router.get(
  "/admin/stats",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  registrationController.getRegistrationStats,
);

router.get(
  "/admin/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  registrationController.getRegistrationById,
);

router.patch(
  "/admin/:id/status",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  registrationController.updateRegistrationStatus,
);

const registrationRouter = router
export default registrationRouter;
