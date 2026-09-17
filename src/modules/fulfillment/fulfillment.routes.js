import { Router } from "express";

import * as fulfillmentController from "./fulfillment.controller.js";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";

import {
  fulfillmentIdSchema,
  orderIdSchema,
  fulfillmentQuerySchema,
  updateFulfillmentStatusSchema,
  updateFulfillmentTrackingSchema,
} from "./fulfillment.validation.js";

const fulfillmentRouter = Router();

fulfillmentRouter.use(authMiddleware, roleMiddleware("ADMIN", "SUPER_ADMIN"));

// ============================================================
// FULFILLMENTS
// ============================================================

fulfillmentRouter.get(
  "/",
  validateQuery(fulfillmentQuerySchema),
  fulfillmentController.getFulfillments,
);

fulfillmentRouter.get(
  "/order/:orderId",
  validateParams(orderIdSchema),
  fulfillmentController.getFulfillmentsByOrder,
);

fulfillmentRouter.post(
  "/order/:orderId/generate",
  validateParams(orderIdSchema),
  fulfillmentController.createFulfillmentsForOrder,
);

fulfillmentRouter.get(
  "/:id",
  validateParams(fulfillmentIdSchema),
  fulfillmentController.getFulfillmentById,
);

fulfillmentRouter.patch(
  "/:id/status",
  validateParams(fulfillmentIdSchema),
  validateBody(updateFulfillmentStatusSchema),
  fulfillmentController.updateFulfillmentStatus,
);

fulfillmentRouter.patch(
  "/:id/tracking",
  validateParams(fulfillmentIdSchema),
  validateBody(updateFulfillmentTrackingSchema),
  fulfillmentController.updateFulfillmentTracking,
);

fulfillmentRouter.delete(
  "/:id",
  validateParams(fulfillmentIdSchema),
  fulfillmentController.deleteFulfillment,
);

export default fulfillmentRouter;
