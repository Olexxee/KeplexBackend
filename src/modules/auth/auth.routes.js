import { Router } from "express";

import { validateBody } from "../../middlewares/validateMiddleware.js";

import { authMiddleware } from "../../middlewares/authMiddleware.js";

import * as authController from "./auth.controller.js";

import { registerSchema, loginSchema } from "./auth.validation.js";

const authRouter = Router();

authRouter.post(
  "/register",
  validateBody(registerSchema),
  authController.register,
);

authRouter.post("/login", validateBody(loginSchema), authController.login);

authRouter.post("/refresh", authController.refreshSession);

authRouter.post("/logout", authController.logout);

authRouter.patch("/me", authMiddleware, authController.updateMe);

authRouter.get("/me", authMiddleware, authController.getMe);

export default authRouter;
