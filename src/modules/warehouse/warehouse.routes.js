import { Router } from "express";
import * as warehouseController from "./warehouse.controller.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";
import {
  warehouseIdSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
} from "./warehouse.validation.js";

const warehouseRouter = Router();

warehouseRouter.use(authMiddleware, roleMiddleware);

// ============================================================
// READ
// ============================================================

warehouseRouter.get(
  "/",
  validateQuery(createWarehouseSchema),
  warehouseController.getWarehouses,
);

warehouseRouter.get(
  "/:id",
  validateParams(warehouseIdSchema),
  warehouseController.getWarehouseById,
);

// ============================================================
// CREATE
// ============================================================

warehouseRouter.post(
  "/",
  validateBody(createWarehouseSchema),
  warehouseController.createWarehouse,
);

// ============================================================
// UPDATE
// ============================================================

warehouseRouter.patch(
  "/:id",
  validateParams(warehouseIdSchema),
  validateBody(updateWarehouseSchema),
  warehouseController.updateWarehouse,
);

// ============================================================
// STATUS
// ============================================================

warehouseRouter.patch(
  "/:id/activate",
  validateParams(warehouseIdSchema),
  warehouseController.activateWarehouse,
);

warehouseRouter.patch(
  "/:id/deactivate",
  validateParams(warehouseIdSchema),
  warehouseController.deactivateWarehouse,
);

// ============================================================
// DELETE
// ============================================================

warehouseRouter.delete(
  "/:id",
  validateParams(warehouseIdSchema),
  warehouseController.deleteWarehouse,
);

export default warehouseRouter;
