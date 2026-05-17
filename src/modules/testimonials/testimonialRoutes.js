import express from "express";
import * as testimonialController from "./testimonialController.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";

const router = express.Router();

router.get("/", testimonialController.getPublicTestimonials);

router.post("/", testimonialController.createTestimonial);

router.get(
  "/admin",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  testimonialController.getAdminTestimonials,
);

router.get(
  "/admin/stats",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  testimonialController.getTestimonialStats,
);

router.patch(
  "/admin/:id/status",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  testimonialController.updateTestimonialStatus,
);

router.delete(
  "/admin/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  testimonialController.deleteTestimonial,
);

const testimonialRouter = router;

export default testimonialRouter;
