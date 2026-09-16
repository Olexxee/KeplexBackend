// modules/fulfillment/fulfillment.validation.js
import Joi from "joi";

export const updateFulfillmentStatusSchema = Joi.object({
  status: Joi.string()
    .valid("PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED")
    .required(),
});

export const updateFulfillmentTrackingSchema = Joi.object({
  trackingNumber: Joi.string().trim().required(),
  carrier: Joi.string().trim().required(),
  trackingUrl: Joi.string().uri().allow(null, "").optional(),
  estimatedDelivery: Joi.date().allow(null).optional(),
});

export const fulfillmentIdSchema = Joi.object({
  id: Joi.string().required(),
});

export const orderIdSchema = Joi.object({
  orderId: Joi.string().required(),
});

export const getFulfillmentsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  orderId: Joi.string().optional(),
  type: Joi.string().valid("LOCAL", "IMPORT", "PREORDER", "DIGITAL").optional(),
  status: Joi.string()
    .valid("PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED")
    .optional(),
  warehouseId: Joi.string().optional(),
});

// Warehouse validation
const createWarehouseSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),

  code: Joi.string().trim().min(2).max(50).required(),

  type: Joi.string().valid("LOCAL", "IMPORT", "PREORDER").default("LOCAL"),

  address: Joi.string().trim().allow(null, "").optional(),

  city: Joi.string().trim().allow(null, "").optional(),

  state: Joi.string().trim().allow(null, "").optional(),

  country: Joi.string().trim().allow(null, "").optional(),

  isActive: Joi.boolean().default(true),
});

export const updateWarehouseSchema = createWarehouseSchema
  .fork(["name", "code"], (schema) => schema.optional())
  .min(1);

export const warehouseIdSchema = Joi.object({
  id: Joi.string().required(),
});

export const getWarehousesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  isActive: Joi.boolean().optional(),
  search: Joi.string().trim().max(100).optional(),
});
