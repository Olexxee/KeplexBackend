import Joi from "joi";

export const checkoutSchema = Joi.object({
  customerName: Joi.string().trim().min(2).max(100).required(),
  customerEmail: Joi.string()
    .trim()
    .lowercase()
    .email()
    .allow(null, "")
    .optional(),
  customerPhone: Joi.string().trim().min(5).max(30).required(),
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
