import { Router } from "express";
import { validateBody } from "../../middlewares/validateMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import * as authController from "./auth.controller.js";
import {
  registerSchema,
  loginSchema,
} from "./auth.validation.js";



const authRouter = Router();

// ========================================
// PUBLIC ROUTES
// ========================================

authRouter.post(
  "/register",
  validateBody(registerSchema),
  authController.register,
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  authController.login,
);

// Refresh must NOT require authMiddleware.
// It authenticates using the refresh-token cookie.
authRouter.post(
  "/refresh",
  authController.refreshSession,
);

authRouter.post(
  "/logout",
  authController.logout,
);

// ========================================
// PROTECTED ROUTES
// ========================================

authRouter.patch(
  "/me",
  authMiddleware,
  authController.updateMe,
);

authRouter.post(
  "/change-password",
  authMiddleware,
  authController.changePassword,
);

authRouter.get(
  "/me",
  authMiddleware,
  authController.getMe,
);

export default authRouter;
