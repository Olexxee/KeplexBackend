import Joi from "joi";

export const checkoutSchema = Joi.object({
  deliveryAddress: Joi.string().trim().allow(null, "").optional(),
  notes: Joi.string().trim().allow(null, "").optional(),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid("PENDING", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED")
    .required(),
});

export const orderIdSchema = Joi.object({
  id: Joi.string().required(),
});

// Used by GET /orders/me — customers can filter their own orders by status
export const getMyOrdersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid("PENDING", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED")
    .optional(),
});

// Used by GET /orders — admin can additionally filter by userId
export const getAllOrdersQuerySchema = getMyOrdersQuerySchema.keys({
  userId: Joi.string().optional(),
});
