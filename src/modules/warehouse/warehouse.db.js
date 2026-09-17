import { prisma } from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

// ============================================================
// SHARED SELECT
// ============================================================

const warehouseSelect = {
  id: true,
  name: true,
  code: true,
  type: true,
  address: true,
  city: true,
  state: true,
  country: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

// ============================================================
// FINDERS
// ============================================================

export const findWarehouseById = async (id, tx) => {
  return dbClient(tx).warehouse.findUnique({
    where: { id },
    select: warehouseSelect,
  });
};

export const findWarehouseByCode = async (code, tx) => {
  return dbClient(tx).warehouse.findUnique({
    where: { code },
    select: warehouseSelect,
  });
};

export const findActiveWarehouseByType = async (type, tx) => {
  return dbClient(tx).warehouse.findFirst({
    where: {
      type,
      isActive: true,
    },
    orderBy: [
      {
        createdAt: "asc",
      },
    ],
    select: warehouseSelect,
  });
};

export const findWarehouses = async ({ type, isActive } = {}, tx) => {
  console.log("5. WAREHOUSE DB HIT");
  console.log("filters:", { type, isActive });

  const result = await dbClient(tx).warehouse.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(typeof isActive === "boolean" ? { isActive } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    select: warehouseSelect,
  });

  console.log("6. PRISMA RETURNED");

  return result;
};

// ============================================================
// CREATE
// ============================================================

export const createWarehouse = async (data, tx) => {
  return dbClient(tx).warehouse.create({
    data,
    select: warehouseSelect,
  });
};

// ============================================================
// UPDATE
// ============================================================

export const updateWarehouse = async (id, data, tx) => {
  return dbClient(tx).warehouse.update({
    where: { id },
    data,
    select: warehouseSelect,
  });
};

// ============================================================
// DELETE
// ============================================================

export const deleteWarehouse = async (id, tx) => {
  return dbClient(tx).warehouse.delete({
    where: { id },
    select: warehouseSelect,
  });
};
