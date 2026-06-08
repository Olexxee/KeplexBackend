import Joi from "joi";

export const createTrainingSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),

  slug: Joi.string().min(3).max(200).allow("", null),

  shortDescription: Joi.string().allow("", null),

  description: Joi.string().allow("", null),

  imageUrl: Joi.string().uri().allow("", null),

  price: Joi.number().positive().required(),

  highlights: Joi.array().items(Joi.string()),

  featured: Joi.boolean(),

  active: Joi.boolean(),

  displayOrder: Joi.number().integer(),
});
