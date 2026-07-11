import Joi from "joi";

export const addToWishlistSchema = Joi.object({
  variantId: Joi.string().required(),
});

export const variantIdSchema = Joi.object({
  variantId: Joi.string().required(),
});

export const batchCheckWishlistSchema = Joi.object({
  variantIds: Joi.array().items(Joi.string()).min(1).required(),
});

export const getWishlistQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
