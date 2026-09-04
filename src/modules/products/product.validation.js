import Joi from "joi";

const variantSchema = Joi.object({
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

  // Used only to associate uploaded multipart files
  // with this variant. Never persisted to Prisma.
  imageIndexes: Joi.array()
    .items(Joi.number().integer().min(0))
    .default([]),

  attributes: Joi.object().optional(),

  metadata: Joi.object().optional(),
});

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),

  slug: Joi.string().trim().lowercase().min(2).max(150).required(),

  description: Joi.string().trim().allow(null, "").optional(),

  brandId: Joi.string().allow(null, "").optional(),

  categoryId: Joi.string().required(),

  collectionId: Joi.string().allow(null, "").optional(),

  isFeatured: Joi.boolean().default(false),

  isNew: Joi.boolean().default(false),

  isBestSeller: Joi.boolean().default(false),

  status: Joi.string().valid("DRAFT", "ACTIVE", "ARCHIVED").default("DRAFT"),

  metadata: Joi.object().optional(),

  variants: Joi.array().items(variantSchema).min(1).required(),

  // Transport-only.
  // This is consumed by the aggregate service
  // and must never be sent to Prisma Product.
  variantImages: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().required(),
        publicId: Joi.string().required(),
        mimeType: Joi.string().allow(null).optional(),
        bytes: Joi.number().integer().min(0).allow(null).optional(),
        format: Joi.string().allow(null).optional(),
        width: Joi.number().integer().min(0).allow(null).optional(),
        height: Joi.number().integer().min(0).allow(null).optional(),
      }),
    )
    .default([]),
});

export const updateProductSchema = createProductSchema
  .fork(["name", "slug", "categoryId", "variants"], (schema) =>
    schema.optional(),
  )
  .min(1);

export const updateProductStatusSchema = Joi.object({
  status: Joi.string().valid("DRAFT", "ACTIVE", "ARCHIVED").required(),
});

export const productIdSchema = Joi.object({
  id: Joi.string().required(),
});

export const productSlugSchema = Joi.object({
  slug: Joi.string().required(),
});

export const getProductsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  categoryId: Joi.string().optional(),
  brandId: Joi.string().optional(),
  collectionId: Joi.string().optional(),
  status: Joi.string().valid("DRAFT", "ACTIVE", "ARCHIVED").optional(),
  isFeatured: Joi.boolean().optional(),
  isNew: Joi.boolean().optional(),
  isBestSeller: Joi.boolean().optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  search: Joi.string().trim().max(100).optional(),
  sortBy: Joi.string()
    .valid("name", "createdAt", "updatedAt", "price")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});
