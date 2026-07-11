import Joi from "joi";

export const createReviewSchema = Joi.object({
  variantId: Joi.string().required(),
  orderId: Joi.string().optional(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().trim().min(3).max(100).optional(),
  comment: Joi.string().trim().min(10).max(2000).optional(),
  images: Joi.array().items(Joi.object()).optional(),
});

export const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  title: Joi.string().trim().min(3).max(100).optional(),
  comment: Joi.string().trim().min(10).max(2000).optional(),
}).min(1);

export const moderateReviewSchema = Joi.object({
  status: Joi.string().valid("APPROVED", "REJECTED").required(),
  response: Joi.string().trim().min(3).max(1000).optional(),
});

export const addReviewResponseSchema = Joi.object({
  comment: Joi.string().trim().min(3).max(1000).required(),
});

export const reviewIdSchema = Joi.object({
  id: Joi.string().required(),
});

export const variantIdSchema = Joi.object({
  variantId: Joi.string().required(),
});

export const getReviewsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid("PENDING", "APPROVED", "REJECTED").optional(),
  userId: Joi.string().optional(),
  search: Joi.string().trim().max(100).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
});
