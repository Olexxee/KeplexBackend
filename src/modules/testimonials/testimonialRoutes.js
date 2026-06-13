import express from "express";
import * as testimonialController from "./testimonialController.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";

const testimonialRouter = express.Router();

testimonialRouter.get("/", testimonialController.getPublicTestimonials);

testimonialRouter.post("/", testimonialController.createTestimonial);

testimonialRouter.get(
  "/admin",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  testimonialController.getAdminTestimonials,
);

testimonialRouter.get(
  "/admin/stats",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  testimonialController.getTestimonialStats,
);

testimonialRouter.patch(
  "/admin/:id/status",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  testimonialController.updateTestimonialStatus,
);

testimonialRouter.delete(
  "/admin/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  testimonialController.deleteTestimonial,
);



export default testimonialRouter;
