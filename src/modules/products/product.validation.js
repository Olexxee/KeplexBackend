import Joi from "joi";

import {
  createVariantAdminSchema as createSingleVariantSchema,
} from "../variants/variant.validation.js";

export { createSingleVariantSchema };

// ============================================================
// VARIANT SCHEMA
// ============================================================

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

  attributes: Joi.object()
    .allow(null)
    .optional(),

  metadata: Joi.object()
    .allow(null)
    .optional(),
});

// ============================================================
// PRODUCT CREATE
// ============================================================

export const createProductSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(150)
    .required(),

  slug: Joi.string()
    .trim()
    .lowercase()
    .min(2)
    .max(150)
    .required(),

  description: Joi.string()
    .trim()
    .allow(null, "")
    .optional(),

  brandId: Joi.string()
    .allow(null, "")
    .optional(),

  categoryId: Joi.string()
    .required(),

  collectionId: Joi.string()
    .allow(null, "")
    .optional(),

  isFeatured: Joi.boolean().default(false),

  isNew: Joi.boolean().default(false),

  isBestSeller: Joi.boolean().default(false),

  status: Joi.string()
    .valid("DRAFT", "ACTIVE", "ARCHIVED")
    .default("DRAFT"),

  metadata: Joi.object().optional(),

  variants: Joi.array()
    .items(variantSchema)
    .min(1)
    .required(),

  variantImages: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().required(),

        publicId: Joi.string().required(),

        mimeType: Joi.string()
          .allow(null)
          .optional(),

        bytes: Joi.number()
          .integer()
          .min(0)
          .allow(null)
          .optional(),

        format: Joi.string()
          .allow(null)
          .optional(),

        width: Joi.number()
          .integer()
          .min(0)
          .allow(null)
          .optional(),

        height: Joi.number()
          .integer()
          .min(0)
          .allow(null)
          .optional(),
      }),
    )
    .default([]),
});

// ============================================================
// PRODUCT UPDATE
// ============================================================

// Variants are intentionally excluded from product updates.
export const updateProductSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(150)
    .optional(),

  slug: Joi.string()
    .trim()
    .lowercase()
    .min(2)
    .max(150)
    .optional(),

  description: Joi.string()
    .trim()
    .allow(null, "")
    .optional(),

  brandId: Joi.string()
    .allow(null, "")
    .optional(),

  categoryId: Joi.string()
    .optional(),

  collectionId: Joi.string()
    .allow(null, "")
    .optional(),

  isFeatured: Joi.boolean().optional(),

  isNew: Joi.boolean().optional(),

  isBestSeller: Joi.boolean().optional(),

  status: Joi.string()
    .valid("DRAFT", "ACTIVE", "ARCHIVED")
    .optional(),

  metadata: Joi.object()
    .allow(null)
    .optional(),
}).min(1);

// ============================================================
// VARIANT UPDATE
// ============================================================

export const updateVariantBodySchema = variantSchema
  .fork(
    ["weight", "price", "actualWeight"],
    (schema) => schema.optional(),
  )
  .min(1);

// ============================================================
// PRODUCT STATUS
// ============================================================

export const updateProductStatusSchema = Joi.object({
  status: Joi.string()
    .valid("DRAFT", "ACTIVE", "ARCHIVED")
    .required(),
});

// ============================================================
// BULK VARIANT CREATION
// ============================================================

export const bulkCreateVariantsSchema = Joi.object({
  variants: Joi.array()
    .items(createSingleVariantSchema)
    .min(1)
    .required(),
});

// ============================================================
// PARAM VALIDATION
// ============================================================

export const productIdSchema = Joi.object({
  id: Joi.string().required(),
});

export const productSlugSchema = Joi.object({
  slug: Joi.string().required(),
});

// ============================================================
// PRODUCT LIST QUERIES
// ============================================================

// Public product filters.
// Status is intentionally excluded because public users should
// not be able to choose arbitrary product statuses.
export const getProductsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),

  categoryId: Joi.string().optional(),

  brandId: Joi.string().optional(),

  collectionId: Joi.string().optional(),

  isFeatured: Joi.boolean().optional(),

  isNew: Joi.boolean().optional(),

  isBestSeller: Joi.boolean().optional(),

  minPrice: Joi.number()
    .min(0)
    .optional(),

  maxPrice: Joi.number()
    .min(0)
    .optional(),

  search: Joi.string()
    .trim()
    .max(100)
    .optional(),

  sortBy: Joi.string()
    .valid("name", "createdAt", "updatedAt", "price")
    .default("createdAt"),

  sortOrder: Joi.string()
    .valid("asc", "desc")
    .default("desc"),
});

// Admin list uses all public filters plus status.
export const getAdminProductsQuerySchema =
  getProductsQuerySchema.keys({
    status: Joi.string()
      .valid("DRAFT", "ACTIVE", "ARCHIVED")
      .optional(),
  });

