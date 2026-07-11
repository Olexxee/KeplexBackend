import Joi from "joi";

export const checkoutSchema = Joi.object({
  deliveryAddress: Joi.string().trim().allow(null, "").optional(),
  notes: Joi.string().trim().allow(null, "").optional(),
  fulfillmentGroups: Joi.object().optional(),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid("PENDING", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED")
    .required(),
});

export const updateCBMSchema = Joi.object({
  totalCBM: Joi.number().min(0).required(),
  totalChargeableWeight: Joi.number().min(0).required(),
  items: Joi.array()
    .items(
      Joi.object({
        variantId: Joi.string().required(),
        cbm: Joi.number().min(0).required(),
        chargeableWeight: Joi.number().min(0).required(),
      }),
    )
    .optional(),
  measurements: Joi.object().optional(),
  notes: Joi.string().allow(null, "").optional(),
});

export const orderIdSchema = Joi.object({
  id: Joi.string().required(),
});

export const orderNumberSchema = Joi.object({
  orderNumber: Joi.string().required(),
});

export const getMyOrdersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid("PENDING", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED")
    .optional(),
  search: Joi.string().trim().max(100).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
});

export const getAllOrdersQuerySchema = getMyOrdersQuerySchema.keys({
  userId: Joi.string().optional(),
});
