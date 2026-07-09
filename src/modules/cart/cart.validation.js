// modules/cart/cart.validation.js
import Joi from "joi";

export const addCartItemSchema = Joi.object({
  variantId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).default(1),
});

export const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
});

export const cartVariantIdSchema = Joi.object({
  variantId: Joi.string().required(),
});

export const mergeCartsSchema = Joi.object({
  sessionId: Joi.string().required(),
});
