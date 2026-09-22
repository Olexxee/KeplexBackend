import Joi from "joi";

// ============================================================
// REVIEW IMAGES
// ============================================================

const reviewImageSchema = Joi.object({
  url: Joi.string().uri().required(),
  publicId: Joi.string().required(),
  mimeType: Joi.string().allow(null),
  bytes: Joi.number().integer().min(0).allow(null),
  format: Joi.string().allow(null),
  width: Joi.number().integer().min(1).allow(null),
  height: Joi.number().integer().min(1).allow(null),
});

// ============================================================
// CUSTOMER — CREATE
// ============================================================

/**
 * Validates the multipart form fields before images are processed.
 *
 * Images are intentionally excluded here because processImages()
 * adds the generated `images` array to req.body afterward.
 */
export const createReviewFieldsSchema = Joi.object({
  variantId: Joi.string().required(),
  orderId: Joi.string().optional(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().trim().min(3).max(100).optional(),
  comment: Joi.string().trim().min(10).max(2000).optional(),
});

/**
 * Final validation after Cloudinary processing.
 *
 * At this point req.body contains the generated images array.
 */
export const createReviewSchema = Joi.object({
  variantId: Joi.string().required(),
  orderId: Joi.string().optional(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().trim().min(3).max(100).optional(),
  comment: Joi.string().trim().min(10).max(2000).optional(),

  images: Joi.array()
    .items(reviewImageSchema)
    .max(3)
    .default([]),
});

// ============================================================
// CUSTOMER — UPDATE
// ============================================================

export const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  title: Joi.string().trim().min(3).max(100).optional(),
  comment: Joi.string().trim().min(10).max(2000).optional(),
}).min(1);

// ============================================================
// REVIEW RESPONSES / MODERATION
// ============================================================

export const moderateReviewSchema = Joi.object({
  status: Joi.string()
    .valid("APPROVED", "REJECTED")
    .required(),

  response: Joi.string()
    .trim()
    .min(3)
    .max(1000)
    .optional(),
});

export const addReviewResponseSchema = Joi.object({
  comment: Joi.string()
    .trim()
    .min(3)
    .max(1000)
    .required(),
});

// ============================================================
// PARAMS
// ============================================================

export const reviewIdSchema = Joi.object({
  id: Joi.string().required(),
});

export const variantIdSchema = Joi.object({
  variantId: Joi.string().required(),
});

// ============================================================
// PUBLIC QUERY
// ============================================================

export const getPublicReviewsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10),
});

// ============================================================
// CUSTOMER QUERY
// ============================================================

export const getMyReviewsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10),
});

// ============================================================
// ADMIN QUERY
// ============================================================

export const getAdminReviewsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),

  variantId: Joi.string().optional(),

  userId: Joi.string().optional(),

  status: Joi.string()
    .valid("PENDING", "APPROVED", "REJECTED")
    .optional(),

  search: Joi.string()
    .trim()
    .max(100)
    .optional(),

  startDate: Joi.date().optional(),

  endDate: Joi.date().optional(),
});

