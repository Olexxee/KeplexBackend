import Joi from "joi";

export const createVariantSchema = Joi.object({
  productId: Joi.string().required(),
  sku: Joi.string().trim().allow(null, "").optional(),
  color: Joi.string().trim().allow(null, "").optional(),
  size: Joi.string().trim().allow(null, "").optional(),
  weight: Joi.number().min(0).required(),
  price: Joi.number().min(0).required(),
  compareAtPrice: Joi.number().min(0).allow(null).optional(),
  stock: Joi.number().integer().min(0).default(0),
  fulfillmentType: Joi.string()
    .valid("LOCAL", "IMPORT", "PREORDER", "DIGITAL")
    .default("LOCAL"),
  length: Joi.number().min(0).allow(null).optional(),
  width: Joi.number().min(0).allow(null).optional(),
  height: Joi.number().min(0).allow(null).optional(),
  actualWeight: Joi.number().min(0).required(),
  shippingType: Joi.string()
    .valid("LOCAL", "IMPORT", "SEA", "AIR", "DIGITAL")
    .default("LOCAL"),
  isActive: Joi.boolean().default(true),
  attributes: Joi.object().optional(),
  metadata: Joi.object().optional(),
});

export const updateVariantSchema = createVariantSchema
  .fork(["productId", "sku", "weight", "price", "actualWeight"], (schema) =>
    schema.optional(),
  )
  .min(1);

export const variantIdSchema = Joi.object({
  id: Joi.string().required(),
});

export const productIdSchema = Joi.object({
  productId: Joi.string().required(),
});

export const bulkCreateVariantsSchema = Joi.object({
  variants: Joi.array().items(createVariantSchema).min(1).required(),
});

export const getVariantsQuerySchema = Joi.object({
  isActive: Joi.boolean().optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  fulfillmentType: Joi.string()
    .valid("LOCAL", "IMPORT", "PREORDER", "DIGITAL")
    .optional(),
  shippingType: Joi.string()
    .valid("LOCAL", "IMPORT", "SEA", "AIR", "DIGITAL")
    .optional(),
});
