import Joi from "joi";

export const smartShoppingRequestSchema = Joi.object({
  message: Joi.string().trim().min(2).max(2000).required().messages({
    "any.required": "Shopping request is required",
    "string.empty": "Shopping request is required",
    "string.min": "Shopping request must be at least 2 characters",
    "string.max": "Shopping request cannot exceed 2000 characters",
  }),

  destination: Joi.object({
    country: Joi.string().trim().max(100).allow("", null),

    state: Joi.string().trim().max(100).allow("", null),

    city: Joi.string().trim().max(100).allow("", null),
  })
    .allow(null)
    .default(null),
}).required();
