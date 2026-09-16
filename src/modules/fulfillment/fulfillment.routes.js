import { Router } from "express";

import * as fulfillmentController from "./fulfillment.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";

const router = Router();

router.use(authenticate);

// ============================================================
// FULFILLMENTS
// ============================================================

router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "STAFF"),
  fulfillmentController.getFulfillments,
);

router.get(
  "/order/:orderId",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "STAFF"),
  fulfillmentController.getFulfillmentsByOrder,
);

router.post(
  "/order/:orderId/generate",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "STAFF"),
  fulfillmentController.createFulfillmentsForOrder,
);

router.patch(
  "/:id/status",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "STAFF"),
  fulfillmentController.updateFulfillmentStatus,
);

router.patch(
  "/:id/tracking",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "STAFF"),
  fulfillmentController.updateFulfillmentTracking,
);

router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  fulfillmentController.deleteFulfillment,
);

// ============================================================
// WAREHOUSES
// IMPORTANT: these MUST appear before "/:id"
// ============================================================

router.get(
  "/warehouses",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "STAFF"),
  fulfillmentController.getWarehouses,
);

router.get(
  "/warehouses/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "STAFF"),
  fulfillmentController.getWarehouseById,
);

router.post(
  "/warehouses",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  fulfillmentController.createWarehouse,
);

router.patch(
  "/warehouses/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  fulfillmentController.updateWarehouse,
);

router.delete(
  "/warehouses/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  fulfillmentController.deleteWarehouse,
);

// ============================================================
// DYNAMIC FULFILLMENT ID
// MUST COME AFTER STATIC ROUTES
// ============================================================

router.get(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "STAFF"),
  fulfillmentController.getFulfillmentById,
);

export default router;
