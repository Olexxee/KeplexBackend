import express from "express";
import * as controller from "./trainingProgram.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import { validateBody } from "../../middlewares/validateMiddleware.js";
import { createTrainingSchema } from "./trainingProgram.validation.js";
import { uploadTrainingImage } from "../../middlewares/uploadMiddleware.js";
import { processItemImages } from "../../middlewares/processItemImages.js";

const trainingRouter = express.Router();

// ─── PUBLIC ───────────────────────────────────────────────
trainingRouter.get("/", controller.getTrainings);
trainingRouter.get("/slug/:slug", controller.getTrainingBySlug);
trainingRouter.get("/:id", controller.getTrainingById);

// ─── ADMIN ────────────────────────────────────────────────
trainingRouter.get(
  "/admin/all",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  controller.getAdminTrainings,
);

trainingRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  validateBody(createTrainingSchema),
  controller.createTraining,
);

trainingRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  controller.updateTraining,
);

trainingRouter.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  controller.toggleTrainingStatus,
);

trainingRouter.patch(
  "/:id/featured",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  controller.toggleFeaturedTraining,
);

trainingRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  controller.deleteTraining,
);

// ─── MEDIA ────────────────────────────────────────────────
trainingRouter.post(
  "/:id/media",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  uploadTrainingImage,
  processItemImages,
  controller.uploadProgramMedia,
);

export default trainingRouter;
