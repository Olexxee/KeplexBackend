import Joi from "joi";

export const createTrainingSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  slug: Joi.string().min(3).max(200).required(),
  shortDescription: Joi.string().allow("", null),
  description: Joi.string().allow("", null),
  price: Joi.number().positive().required(),
  categoryId: Joi.string().allow(null, ""),
  featured: Joi.boolean(),
  active: Joi.boolean(),
  displayOrder: Joi.number().integer(),
});
