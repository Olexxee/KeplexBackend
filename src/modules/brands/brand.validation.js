import Joi from "joi";

export const createBrandSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  slug: Joi.string().trim().lowercase().min(2).max(100).required(),
  logo: Joi.string().uri().allow(null, "").optional(),
  description: Joi.string().trim().allow(null, "").optional(),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).default(0),
});

export const updateBrandSchema = createBrandSchema
  .fork(["name", "slug"], (schema) => schema.optional())
  .min(1);

export const brandIdSchema = Joi.object({
  id: Joi.string().required(),
});

export const brandSlugSchema = Joi.object({
  slug: Joi.string().required(),
});

export const getBrandsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  isActive: Joi.boolean().optional(),
  search: Joi.string().trim().max(100).optional(),
});
