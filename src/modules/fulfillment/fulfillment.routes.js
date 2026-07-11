// modules/fulfillment/fulfillment.routes.js
import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";
import * as fulfillmentController from "./fulfillment.controller.js";
import {
  updateFulfillmentStatusSchema,
  updateFulfillmentTrackingSchema,
  fulfillmentIdSchema,
  orderIdSchema,
  getFulfillmentsQuerySchema,
  createWarehouseSchema,
  updateWarehouseSchema,
  warehouseIdSchema,
  getWarehousesQuerySchema,
} from "./fulfillment.validation.js";

const fulfillmentRouter = Router();

// All fulfillment routes require admin access
fulfillmentRouter.use(authMiddleware);
fulfillmentRouter.use(roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"));

// Fulfillment routes
fulfillmentRouter.get(
  "/",
  validateQuery(getFulfillmentsQuerySchema),
  fulfillmentController.getFulfillments,
);

fulfillmentRouter.get(
  "/order/:orderId",
  validateParams(orderIdSchema),
  fulfillmentController.getFulfillmentsByOrder,
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

fulfillmentRouter.post(
  "/order/:orderId/generate",
  validateParams(orderIdSchema),
  fulfillmentController.createFulfillmentsForOrder,
);

fulfillmentRouter.delete(
  "/:id",
  validateParams(fulfillmentIdSchema),
  fulfillmentController.deleteFulfillment,
);

// Warehouse routes
fulfillmentRouter.get(
  "/warehouses",
  validateQuery(getWarehousesQuerySchema),
  fulfillmentController.getWarehouses,
);

fulfillmentRouter.get(
  "/warehouses/:id",
  validateParams(warehouseIdSchema),
  fulfillmentController.getWarehouseById,
);

fulfillmentRouter.post(
  "/warehouses",
  validateBody(createWarehouseSchema),
  fulfillmentController.createWarehouse,
);

fulfillmentRouter.patch(
  "/warehouses/:id",
  validateParams(warehouseIdSchema),
  validateBody(updateWarehouseSchema),
  fulfillmentController.updateWarehouse,
);

fulfillmentRouter.delete(
  "/warehouses/:id",
  validateParams(warehouseIdSchema),
  fulfillmentController.deleteWarehouse,
);

export default fulfillmentRouter;
