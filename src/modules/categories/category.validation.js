import Joi from "joi";

export const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  slug: Joi.string().trim().lowercase().min(2).max(100).required(),
  description: Joi.string().trim().allow(null, "").optional(),
  type: Joi.string().valid("PRODUCT", "SERVICE", "CONTENT").default("PRODUCT"),
  parentId: Joi.string().allow(null, "").optional(),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).default(0),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  slug: Joi.string().trim().lowercase().min(2).max(100).optional(),
  description: Joi.string().trim().allow(null, "").optional(),
  type: Joi.string().valid("PRODUCT", "SERVICE", "CONTENT").optional(),
  parentId: Joi.string().allow(null, "").optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
}).min(1);

export const categoryIdSchema = Joi.object({
  id: Joi.string().required(),
});
