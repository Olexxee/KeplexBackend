import Joi from "joi";

const itemImageSchema = Joi.object({
  url: Joi.string().uri().required(),
  publicId: Joi.string().required(),
  width: Joi.number().optional(),
  height: Joi.number().optional(),
  format: Joi.string().optional(),
  bytes: Joi.number().optional(),
});

export const createItemSchema = Joi.object({
  categoryId: Joi.string().required(),
  name: Joi.string().trim().min(2).max(150).required(),
  slug: Joi.string().trim().lowercase().min(2).max(150).required(),
  description: Joi.string().trim().allow(null, "").optional(),
  price: Joi.number().min(0).required(),
  compareAtPrice: Joi.number().min(0).allow(null).optional(),
  sku: Joi.string().trim().allow(null, "").optional(),
  stock: Joi.number().integer().min(0).default(0),
  itemType: Joi.string()
    .valid("PRODUCT", "SERVICE", "PACKAGE")
    .default("PRODUCT"),
  status: Joi.string().valid("DRAFT", "ACTIVE", "ARCHIVED").default("DRAFT"),
  images: Joi.array().items(itemImageSchema).optional(),
  metadata: Joi.object().optional(),
});

export const updateItemSchema = createItemSchema
  .fork(["categoryId", "name", "slug", "price"], (schema) => schema.optional())
  .min(1);

export const itemIdSchema = Joi.object({
  id: Joi.string().required(),
});
