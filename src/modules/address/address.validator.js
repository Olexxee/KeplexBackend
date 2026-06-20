import Joi from "joi";

export const createAddressSchema = Joi.object({
  label: Joi.string().trim().max(50).allow("", null),

  fullName: Joi.string().trim().min(2).max(100).required(),

  phone: Joi.string().trim().min(7).max(20).required(),

  addressLine: Joi.string().trim().min(5).max(255).required(),

  city: Joi.string().trim().min(2).max(100).required(),

  state: Joi.string().trim().max(100).allow("", null),

  country: Joi.string().trim().max(100).default("Nigeria"),

  isDefault: Joi.boolean().default(false),
});

export const updateAddressSchema = Joi.object({
  label: Joi.string().trim().max(50),

  fullName: Joi.string().trim().min(2).max(100),

  phone: Joi.string().trim().min(7).max(20),

  addressLine: Joi.string().trim().min(5).max(255),

  city: Joi.string().trim().min(2).max(100),

  state: Joi.string().trim().max(100),

  country: Joi.string().trim().max(100),

  isDefault: Joi.boolean(),
}).min(1);

export const addressIdSchema = Joi.object({
  id: Joi.string().required(),
});