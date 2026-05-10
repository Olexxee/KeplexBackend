import Joi from "joi";

export const addCartItemSchema = Joi.object({
  itemId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).default(1),
});

export const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
});

export const cartItemIdSchema = Joi.object({
  itemId: Joi.string().required(),
});
