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
export const createWarehouseSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  code: Joi.string().trim().min(2).max(20).required(),
  address: Joi.string().trim().required(),
  city: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
  country: Joi.string().trim().default("NG"),
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
