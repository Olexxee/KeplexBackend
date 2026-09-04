// modules/brands/brand.validation.js
import Joi from "joi";

export const createBrandSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Name must be at least 2 characters long",
    "string.max": "Name must not exceed 100 characters",
    "any.required": "Name is required",
  }),
  slug: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-z0-9-]+$/)
    .required()
    .messages({
      "string.min": "Slug must be at least 2 characters long",
      "string.max": "Slug must not exceed 100 characters",
      "string.pattern.base":
        "Slug can only contain lowercase letters, numbers, and hyphens",
      "any.required": "Slug is required",
    }),
  description: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional().messages({
    "number.integer": "Sort order must be an integer",
    "number.min": "Sort order must be at least 0",
  }),
});

export const updateBrandSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    "string.min": "Name must be at least 2 characters long",
    "string.max": "Name must not exceed 100 characters",
  }),
  slug: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-z0-9-]+$/)
    .optional()
    .messages({
      "string.min": "Slug must be at least 2 characters long",
      "string.max": "Slug must not exceed 100 characters",
      "string.pattern.base":
        "Slug can only contain lowercase letters, numbers, and hyphens",
    }),
  description: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional().messages({
    "number.integer": "Sort order must be an integer",
    "number.min": "Sort order must be at least 0",
  }),
});

export const brandIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^c[a-z0-9]{24,}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid brand ID format",
      "any.required": "Brand ID is required",
    }),
});

export const brandSlugSchema = Joi.object({
  slug: Joi.string().min(2).max(100).required().messages({
    "string.min": "Slug must be at least 2 characters long",
    "string.max": "Slug must not exceed 100 characters",
    "any.required": "Slug is required",
  }),
});

export const getBrandsQuerySchema = Joi.object({
  page: Joi.number().integer().positive().optional().messages({
    "number.integer": "Page must be an integer",
    "number.positive": "Page must be a positive number",
  }),
  limit: Joi.number().integer().positive().max(100).optional().messages({
    "number.integer": "Limit must be an integer",
    "number.positive": "Limit must be a positive number",
    "number.max": "Limit must not exceed 100",
  }),
  isActive: Joi.boolean().optional().messages({
    "boolean.base": "isActive must be a boolean",
  }),
  search: Joi.string().optional(),
});
