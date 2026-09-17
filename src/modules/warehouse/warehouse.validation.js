import Joi from "joi";

const warehouseTypes = ["LOCAL", "IMPORT", "PREORDER", "DIGITAL"];

// ============================================================
// WAREHOUSE ID
// ============================================================

export const warehouseIdSchema = Joi.object({
  id: Joi.string().trim().min(1).required().messages({
    "string.empty": "Warehouse ID is required",
    "any.required": "Warehouse ID is required",
  }),
});

// ============================================================
// CREATE WAREHOUSE
// ============================================================

export const createWarehouseSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required().messages({
    "string.empty": "Warehouse name is required",
    "string.min": "Warehouse name must be at least 2 characters",
    "string.max": "Warehouse name cannot exceed 120 characters",
    "any.required": "Warehouse name is required",
  }),

  code: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .required()
    .messages({
      "string.empty": "Warehouse code is required",
      "string.min": "Warehouse code must be at least 2 characters",
      "string.max": "Warehouse code cannot exceed 50 characters",
      "string.pattern.base":
        "Warehouse code must contain only letters, numbers, underscores, or hyphens",
      "any.required": "Warehouse code is required",
    }),

  type: Joi.string()
    .valid(...warehouseTypes)
    .default("LOCAL"),

  address: Joi.string().trim().max(255).allow(null, "").optional().messages({
    "string.max": "Address cannot exceed 255 characters",
  }),

  city: Joi.string().trim().max(100).allow(null, "").optional().messages({
    "string.max": "City cannot exceed 100 characters",
  }),

  state: Joi.string().trim().max(100).allow(null, "").optional().messages({
    "string.max": "State cannot exceed 100 characters",
  }),

  country: Joi.string().trim().max(100).allow(null, "").optional().messages({
    "string.max": "Country cannot exceed 100 characters",
  }),

  isActive: Joi.boolean().default(true),
});

// ============================================================
// UPDATE WAREHOUSE
// ============================================================

export const updateWarehouseSchema = createWarehouseSchema
  .fork(["name", "code"], (schema) => schema.optional())
  .min(1)
  .messages({
    "object.min": "At least one warehouse field is required",
  });

// ============================================================
// QUERY
// ============================================================

export const warehouseQuerySchema = Joi.object({
  type: Joi.string()
    .valid(...warehouseTypes)
    .optional(),

  isActive: Joi.boolean().optional(),
});
