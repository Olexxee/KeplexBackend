import Joi from "joi";

const mediaItemSchema = Joi.object({
  url: Joi.string().required(),
  publicId: Joi.string().required(),
  mimeType: Joi.string().allow(null).optional(),
  bytes: Joi.number().integer().min(0).allow(null).optional(),
  format: Joi.string().allow(null).optional(),
  width: Joi.number().integer().min(0).allow(null).optional(),
  height: Joi.number().integer().min(0).allow(null).optional(),
});

const variantFieldsSchema = Joi.object({
  productId: Joi.string().required(),

  sku: Joi.string().trim().allow(null, "").optional(),
  color: Joi.string().trim().allow(null, "").optional(),
  size: Joi.string().trim().allow(null, "").optional(),

  price: Joi.number().min(0).required(),
  compareAtPrice: Joi.number().min(0).allow(null).optional(),
  stock: Joi.number().integer().min(0).default(0),

  weight: Joi.number().min(0).required(),
  actualWeight: Joi.number().min(0).required(),
  length: Joi.number().min(0).allow(null).optional(),
  width: Joi.number().min(0).allow(null).optional(),
  height: Joi.number().min(0).allow(null).optional(),

  fulfillmentType: Joi.string()
    .valid("LOCAL", "IMPORT", "PREORDER", "DIGITAL")
    .default("LOCAL"),
  shippingType: Joi.string()
    .valid("LOCAL", "IMPORT", "SEA", "AIR", "DIGITAL")
    .default("LOCAL"),

  isActive: Joi.boolean().default(true),

  attributes: Joi.object().allow(null).optional(),
  metadata: Joi.object().allow(null).optional(),
});

export const createVariantAdminSchema = variantFieldsSchema.keys({
  variantImages: Joi.array().items(mediaItemSchema).default([]),
});

export const updateVariantAdminSchema = variantFieldsSchema
  .fork(["productId", "sku", "weight", "price", "actualWeight"], (schema) =>
    schema.optional(),
  )
  .keys({
    productId: Joi.any().forbidden(), // cannot reparent
    variantImages: Joi.array().items(mediaItemSchema).optional(),
  })
  .min(1);

export const bulkCreateVariantsSchema = Joi.object({
  variants: Joi.array().items(createVariantAdminSchema).min(1).required(),
});

export const variantIdSchema = Joi.object({
  id: Joi.string().required(),
});

export const productIdSchema = Joi.object({
  productId: Joi.string().required(),
});
