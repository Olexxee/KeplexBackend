import express from "express";
import * as controller from "./trainingProgram.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import { validate } from "../../middleware/validate.js";
import { createTrainingSchema } from "./trainingProgram.validation.js";

const trainingRouter = express.Router();

// PUBLIC
trainingRouter.get("/", controller.getTrainings);
trainingRouter.get("/:id", controller.getTrainingById);

// ADMIN ONLY
trainingRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  validate(createTrainingSchema),
  controller.createTraining,
);

trainingRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  controller.updateTraining,
);

trainingRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  controller.deleteTraining,
);

export default trainingRouter;
