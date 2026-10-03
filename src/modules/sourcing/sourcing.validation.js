import Joi from "joi";

/* ------------------------------------------------------------------ */
/* Shared enums                                                       */
/* ------------------------------------------------------------------ */

/*
 * IMPORTANT: keep these in sync with your Prisma enums.
 * If Prisma throws on a value that Joi accepted, you've drifted.
 */
const SOURCING_REQUEST_STATUSES = [
  "SUBMITTED",
  "IN_REVIEW",
  "RESPONDED",
  "COMPLETED",
  "DECLINED",
  "CANCELLED",
];

const SOURCING_RESPONSE_STATUSES = [
  "PENDING",
  "OFFERED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "CANCELLED",
];

/* ------------------------------------------------------------------ */
/* Reusable pieces                                                    */
/* ------------------------------------------------------------------ */

/*
 * Adjust to match your Prisma ID strategy:
 *   @default(uuid())  → .uuid()
 *   @default(cuid())  → .cuid()
 *   @default(nanoid()) → leave as .string().trim()
 */
const idParamSchema = Joi.object({
  id: Joi.string().trim().required(),
});

const referenceImageSchema = Joi.object({
  url: Joi.string().uri().required(),
  publicId: Joi.string().required(),
  mimeType: Joi.string().required(),
  bytes: Joi.number().integer().min(0).required(),
  format: Joi.string().allow(null, "").default(null),
  width: Joi.number().integer().min(1).allow(null).default(null),
  height: Joi.number().integer().min(1).allow(null).default(null),
});

/* ------------------------------------------------------------------ */
/* Customer                                                           */
/* ------------------------------------------------------------------ */

export const createSourcingRequestSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required(),

  description: Joi.string().trim().max(5000).allow(null, "").default(null),

  referenceUrl: Joi.string().uri().allow(null, "").default(null),

  referenceImages: Joi.array().items(referenceImageSchema).max(5).default([]),
});

export const sourcingListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(20),

  status: Joi.string()
    .valid(...SOURCING_REQUEST_STATUSES)
    .optional(),
});

/* ------------------------------------------------------------------ */
/* Admin                                                              */
/* ------------------------------------------------------------------ */

export const sourcingIdSchema = idParamSchema;

export const sourcingResponseIdSchema = idParamSchema;

export const updateSourcingRequestStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...SOURCING_REQUEST_STATUSES)
    .required(),
});

/*
 * Design B: the frontend creates the sourced product through the
 * normal product pipeline (which handles image uploads), then calls
 * this endpoint to LINK the existing product + variant to the
 * sourcing request. We only validate that the IDs are present and
 * well-formed here; existence and ownership are enforced in the
 * service layer, inside the transaction.
 */
export const createSourcingResponseSchema = Joi.object({
  message: Joi.string().trim().max(2000).allow(null, "").default(null),

  expiresAt: Joi.date().iso().greater("now").allow(null).default(null),

  productId: Joi.string().trim().required(),

  variantId: Joi.string().trim().required(),
});

export const updateSourcingResponseStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...SOURCING_RESPONSE_STATUSES)
    .required(),
});
