import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../classes/errorClasses.js";
import * as warehouseDb from "./warehouse.db.js";

// ============================================================
// CONSTANTS
// ============================================================

const WAREHOUSE_TYPES = {
  LOCAL: "LOCAL",
  IMPORT: "IMPORT",
  PREORDER: "PREORDER",
  DIGITAL: "DIGITAL",
};

const normalizeCode = (code) => {
  return code.trim().toUpperCase();
};

const normalizeNullableString = (value) => {
  if (value === undefined || value === null) {
    return value;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
};

// ============================================================
// GET WAREHOUSES
// ============================================================

export const getWarehouses = async ({ type, isActive } = {}) => {
  return warehouseDb.findWarehouses({
    type,
    isActive,
  });
};

// ============================================================
// GET WAREHOUSE
// ============================================================

export const getWarehouseById = async (id) => {
  const warehouse = await warehouseDb.findWarehouseById(id);

  if (!warehouse) {
    throw new NotFoundError("Warehouse not found");
  }

  return warehouse;
};

// ============================================================
// GET ACTIVE WAREHOUSE BY TYPE
// ============================================================

export const getActiveWarehouseByType = async (type, tx) => {
  if (!Object.values(WAREHOUSE_TYPES).includes(type)) {
    throw new BadRequestError(`Unsupported warehouse type: ${type}`);
  }

  if (type === WAREHOUSE_TYPES.DIGITAL) {
    return null;
  }

  const warehouse = await warehouseDb.findActiveWarehouseByType(type, tx);

  if (!warehouse) {
    throw new NotFoundError(
      `No active warehouse configured for fulfillment type: ${type}`,
    );
  }

  return warehouse;
};

// ============================================================
// CREATE WAREHOUSE
// ============================================================

export const createWarehouse = async (payload) => {
  const data = {
    name: payload.name.trim(),
    code: normalizeCode(payload.code),
    type: payload.type || WAREHOUSE_TYPES.LOCAL,
    address: normalizeNullableString(payload.address),
    city: normalizeNullableString(payload.city),
    state: normalizeNullableString(payload.state),
    country: normalizeNullableString(payload.country),
    isActive: payload.isActive === undefined ? true : payload.isActive,
  };

  const existingWarehouse = await warehouseDb.findWarehouseByCode(data.code);

  if (existingWarehouse) {
    throw new ConflictError(`Warehouse code already exists: ${data.code}`);
  }

  return warehouseDb.createWarehouse(data);
};

// ============================================================
// UPDATE WAREHOUSE
// ============================================================

export const updateWarehouse = async (id, payload) => {
  const existingWarehouse = await warehouseDb.findWarehouseById(id);

  if (!existingWarehouse) {
    throw new NotFoundError("Warehouse not found");
  }

  const data = {};

  if (payload.name !== undefined) {
    data.name = payload.name.trim();
  }

  if (payload.code !== undefined) {
    const normalizedCode = normalizeCode(payload.code);

    const warehouseWithCode =
      await warehouseDb.findWarehouseByCode(normalizedCode);

    if (warehouseWithCode && warehouseWithCode.id !== id) {
      throw new ConflictError(
        `Warehouse code already exists: ${normalizedCode}`,
      );
    }

    data.code = normalizedCode;
  }

  if (payload.type !== undefined) {
    data.type = payload.type;
  }

  if (payload.address !== undefined) {
    data.address = normalizeNullableString(payload.address);
  }

  if (payload.city !== undefined) {
    data.city = normalizeNullableString(payload.city);
  }

  if (payload.state !== undefined) {
    data.state = normalizeNullableString(payload.state);
  }

  if (payload.country !== undefined) {
    data.country = normalizeNullableString(payload.country);
  }

  if (payload.isActive !== undefined) {
    data.isActive = payload.isActive;
  }

  if (Object.keys(data).length === 0) {
    throw new BadRequestError("No warehouse changes supplied");
  }

  return warehouseDb.updateWarehouse(id, data);
};

// ============================================================
// ACTIVATE WAREHOUSE
// ============================================================

export const activateWarehouse = async (id) => {
  const warehouse = await warehouseDb.findWarehouseById(id);

  if (!warehouse) {
    throw new NotFoundError("Warehouse not found");
  }

  if (warehouse.isActive) {
    return warehouse;
  }

  return warehouseDb.updateWarehouse(id, {
    isActive: true,
  });
};

// ============================================================
// DEACTIVATE WAREHOUSE
// ============================================================

export const deactivateWarehouse = async (id) => {
  const warehouse = await warehouseDb.findWarehouseById(id);

  if (!warehouse) {
    throw new NotFoundError("Warehouse not found");
  }

  if (!warehouse.isActive) {
    return warehouse;
  }

  return warehouseDb.updateWarehouse(id, {
    isActive: false,
  });
};

// ============================================================
// DELETE WAREHOUSE
// ============================================================

export const deleteWarehouse = async (id) => {
  const warehouse = await warehouseDb.findWarehouseById(id);

  if (!warehouse) {
    throw new NotFoundError("Warehouse not found");
  }

  if (warehouse.isActive) {
    throw new BadRequestError("Deactivate the warehouse before deleting it");
  }

  return warehouseDb.deleteWarehouse(id);
};

export { WAREHOUSE_TYPES };
