import Joi from "joi";

const categoryType = Joi.string().valid("PRODUCT", "SERVICE", "CONTENT");

export const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  slug: Joi.string().trim().lowercase().min(2).max(100).required(),
  description: Joi.string().trim().allow(null, "").optional(),
  type: categoryType.default("PRODUCT"),
  parentId: Joi.string().trim().allow(null, "").optional(),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).default(0),
  alt: Joi.string().trim().max(200).allow(null, "").optional(),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  slug: Joi.string().trim().lowercase().min(2).max(100).optional(),
  description: Joi.string().trim().allow(null, "").optional(),
  type: categoryType.optional(),
  parentId: Joi.string().trim().allow(null, "").optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  alt: Joi.string().trim().max(200).allow(null, "").optional(),
}).min(1);

export const categoryIdSchema = Joi.object({
  id: Joi.string().required(),
});

export const categorySlugSchema = Joi.object({
  slug: Joi.string().trim().required(),
});

export const getCategoriesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: categoryType.optional(),
  isActive: Joi.boolean().optional(),
  parentId: Joi.string().allow(null, "").optional(),
  search: Joi.string().trim().max(100).optional(),
});
