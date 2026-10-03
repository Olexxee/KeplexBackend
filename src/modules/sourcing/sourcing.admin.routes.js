import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import * as sourcingController from "./sourcing.controller.js";
import {
  createSourcingResponseSchema, 
  sourcingIdSchema,
  sourcingResponseIdSchema,
  sourcingListQuerySchema,
  updateSourcingRequestStatusSchema,
  updateSourcingResponseStatusSchema, 
} from "./sourcing.validation.js";


const sourcingAdminRouter = Router();

/*
 * Every route in this file requires authentication AND an admin role.
 * Router-level middleware guarantees new routes are protected by default.
 */
sourcingAdminRouter.use(authMiddleware);
sourcingAdminRouter.use(roleMiddleware("SUPER_ADMIN", "ADMIN"));

sourcingAdminRouter.get(
  "/list",
  validateQuery(sourcingListQuerySchema),
  sourcingController.getAdminSourcingRequests,
);


sourcingAdminRouter.get(
  "/:id",
  validateParams(sourcingIdSchema),
  sourcingController.getAdminSourcingRequest,
);

sourcingAdminRouter.patch(
  "/:id/status",
  validateParams(sourcingIdSchema),
  validateBody(updateSourcingRequestStatusSchema),
  sourcingController.updateSourcingRequestStatus,
);

sourcingAdminRouter.post(
  "/:id/respond",
  validateParams(sourcingIdSchema),
  validateBody(createSourcingResponseSchema), // ← restored
  sourcingController.respondToSourcingRequest,
);


sourcingAdminRouter.patch(
  "/responses/:id/status",
  validateParams(sourcingResponseIdSchema),
  validateBody(updateSourcingResponseStatusSchema),
  sourcingController.updateSourcingResponseStatus,
);

export default sourcingAdminRouter;
