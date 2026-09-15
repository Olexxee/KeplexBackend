import Joi from "joi";

export const addToWishlistSchema = Joi.object({
  productId: Joi.string().required(),
});

export const productIdSchema = Joi.object({
  productId: Joi.string().required(),
});

export const batchCheckWishlistSchema = Joi.object({
  productIds: Joi.array().items(Joi.string().required()).min(1).required(),
});

export const getWishlistQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
