// src/modules/fulfillment/fulfillment.validation.js

import Joi from "joi";

// ============================================================
// CONSTANTS
// ============================================================

export const fulfillmentTypes = ["LOCAL", "IMPORT", "PREORDER", "DIGITAL"];

export const fulfillmentStatuses = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

// ============================================================
// PARAMS
// ============================================================

export const fulfillmentIdSchema = Joi.object({
  id: Joi.string().trim().required().messages({
    "any.required": "Fulfillment ID is required",
    "string.empty": "Fulfillment ID is required",
  }),
});

export const orderIdSchema = Joi.object({
  orderId: Joi.string().trim().required().messages({
    "any.required": "Order ID is required",
    "string.empty": "Order ID is required",
  }),
});

// ============================================================
// STATUS
// ============================================================

export const updateFulfillmentStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...fulfillmentStatuses)
    .required()
    .messages({
      "any.required": "Fulfillment status is required",
      "any.only": "Invalid fulfillment status",
    }),
});

// ============================================================
// TRACKING
// ============================================================

export const updateFulfillmentTrackingSchema = Joi.object({
  trackingNumber: Joi.string().trim().required().messages({
    "any.required": "Tracking number is required",
    "string.empty": "Tracking number is required",
  }),

  carrier: Joi.string().trim().required().messages({
    "any.required": "Carrier is required",
    "string.empty": "Carrier is required",
  }),

  trackingUrl: Joi.string().trim().uri().allow(null, "").optional().messages({
    "string.uri": "Tracking URL must be a valid URL",
  }),

  estimatedDelivery: Joi.date().allow(null).optional().messages({
    "date.base": "Estimated delivery must be a valid date",
  }),
});

// ============================================================
// QUERY
// ============================================================

export const fulfillmentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(20),

  orderId: Joi.string().trim().min(1).optional(),

  type: Joi.string()
    .valid(...fulfillmentTypes)
    .optional(),

  status: Joi.string()
    .valid(...fulfillmentStatuses)
    .optional(),

  warehouseId: Joi.string().trim().min(1).optional(),
});
