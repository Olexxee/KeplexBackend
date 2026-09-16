import * as warehouseService from "./warehouse.service.js";
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";

// ============================================================
// GET ALL
// ============================================================

export const getWarehouses = asyncWrapper(async (req, res) => {
  const warehouses = await warehouseService.getWarehouses(req.query);

  return successResponse(res, 200, "Warehouses fetched successfully", {
    warehouses,
  });
});

// ============================================================
// GET ONE
// ============================================================

export const getWarehouseById = asyncWrapper(async (req, res) => {
  const warehouse = await warehouseService.getWarehouseById(req.params.id);

  return successResponse(res, 200, "Warehouse fetched successfully", {
    warehouse,
  });
});

// ============================================================
// CREATE
// ============================================================

export const createWarehouse = asyncWrapper(async (req, res) => {
  const warehouse = await warehouseService.createWarehouse(req.body);

  return successResponse(res, 201, "Warehouse created successfully", {
    warehouse,
  });
});

// ============================================================
// UPDATE
// ============================================================

export const updateWarehouse = asyncWrapper(async (req, res) => {
  const warehouse = await warehouseService.updateWarehouse(
    req.params.id,
    req.body,
  );

  return successResponse(res, 200, "Warehouse updated successfully", {
    warehouse,
  });
});

// ============================================================
// ACTIVATE
// ============================================================

export const activateWarehouse = asyncWrapper(async (req, res) => {
  const warehouse = await warehouseService.activateWarehouse(req.params.id);

  return successResponse(res, 200, "Warehouse activated successfully", {
    warehouse,
  });
});

// ============================================================
// DEACTIVATE
// ============================================================

export const deactivateWarehouse = asyncWrapper(async (req, res) => {
  const warehouse = await warehouseService.deactivateWarehouse(req.params.id);

  return successResponse(res, 200, "Warehouse deactivated successfully", {
    warehouse,
  });
});

// ============================================================
// DELETE
// ============================================================

export const deleteWarehouse = asyncWrapper(async (req, res) => {
  const warehouse = await warehouseService.deleteWarehouse(req.params.id);

  return successResponse(res, 200, "Warehouse deleted successfully", {
    warehouse,
  });
});
