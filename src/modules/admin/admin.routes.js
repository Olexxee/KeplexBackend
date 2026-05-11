import { Router } from "express";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import {
  validateBody,
  validateParams,
} from "../../middlewares/validateMiddleware.js";
import * as adminController from "./admin.controller.js";
import {
  createStaffSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdSchema,
} from "./admin.validation.js";

const adminRouter = Router();

adminRouter.use(authMiddleware);
adminRouter.use(roleMiddleware("SUPER_ADMIN", "ADMIN"));

adminRouter.get("/users", adminController.getUsers);
adminRouter.get(
  "/users/:id",
  validateParams(userIdSchema),
  adminController.getUserById,
);

adminRouter.post(
  "/staff",
  validateBody(createStaffSchema),
  adminController.createStaff,
);

adminRouter.patch(
  "/users/:id/role",
  validateParams(userIdSchema),
  validateBody(updateUserRoleSchema),
  adminController.updateUserRole,
);

adminRouter.patch(
  "/users/:id/status",
  validateParams(userIdSchema),
  validateBody(updateUserStatusSchema),
  adminController.updateUserStatus,
);

export default adminRouter;
