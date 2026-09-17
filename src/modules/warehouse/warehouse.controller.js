import * as warehouseService from "./warehouse.service.js";
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";

// ============================================================
// GET ALL
// ============================================================

export const getWarehouses = asyncWrapper(async (req, res) => {
  const warehouses = await warehouseService.getWarehouses(req.query);

  return successResponse({
    res,
    statusCode: 200,
    message: "Warehouses fetched successfully",
    data: {
      warehouses,
    },
  });
});

// ============================================================
// GET ONE
// ============================================================

export const getWarehouseById = asyncWrapper(async (req, res) => {
  const warehouse = await warehouseService.getWarehouseById(req.params.id);

  return successResponse({
    res,
    statusCode: 200,
    message: "Warehouse fetched successfully",
    data: {
      warehouse,
    },
  });
});

// ============================================================
// CREATE
// ============================================================

export const createWarehouse = asyncWrapper(async (req, res) => {
  const warehouse = await warehouseService.createWarehouse(req.body);

  return successResponse({
    res,
    statusCode: 201,
    message: "Warehouse created successfully",
    data: {
      warehouse,
    },
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

  return successResponse({
    res,
    statusCode: 200,
    message: "Warehouse updated successfully",
    data: {
      warehouse,
    },
  });
});

// ============================================================
// ACTIVATE
// ============================================================

export const activateWarehouse = asyncWrapper(async (req, res) => {
  const warehouse = await warehouseService.activateWarehouse(req.params.id);

  return successResponse({
    res,
    statusCode: 200,
    message: "Warehouse activated successfully",
    data: {
      warehouse,
    },
  });
});

// ============================================================
// DEACTIVATE
// ============================================================

export const deactivateWarehouse = asyncWrapper(async (req, res) => {
  const warehouse = await warehouseService.deactivateWarehouse(req.params.id);

  return successResponse({
    res,
    statusCode: 200,
    message: "Warehouse deactivated successfully",
    data: {
      warehouse,
    },
  });
});

// ============================================================
// DELETE
// ============================================================

export const deleteWarehouse = asyncWrapper(async (req, res) => {
  const warehouse = await warehouseService.deleteWarehouse(req.params.id);

  return successResponse({
    res,
    statusCode: 200,
    message: "Warehouse deleted successfully",
    data: {
      warehouse,
    },
  });
});