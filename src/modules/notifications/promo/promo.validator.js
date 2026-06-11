import Joi from "joi";

const promoSchema = Joi.object({
  subject: Joi.string().trim().min(5).max(150).required().messages({
    "string.min": "Subject must be at least 5 characters",
    "string.max": "Subject cannot exceed 150 characters",
    "any.required": "Subject is required",
  }),

  title: Joi.string().trim().min(3).max(200).required().messages({
    "string.min": "Title must be at least 3 characters",
    "string.max": "Title cannot exceed 200 characters",
    "any.required": "Title is required",
  }),

  body: Joi.string().trim().min(10).required().messages({
    "string.min": "Body must be at least 10 characters",
    "any.required": "Body is required",
  }),

  ctaUrl: Joi.string().uri().optional().messages({
    "string.uri": "CTA URL must be a valid URL",
  }),

  ctaLabel: Joi.string().trim().max(50).optional().messages({
    "string.max": "CTA label cannot exceed 50 characters",
  }),
});

