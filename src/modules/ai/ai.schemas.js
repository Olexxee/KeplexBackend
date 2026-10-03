import Joi from "joi";

export const productIdentificationSchema = Joi.object({
  productType: Joi.string().trim().allow(null, "").default(null),

  brand: Joi.string().trim().allow(null, "").default(null),

  possibleModel: Joi.string().trim().allow(null, "").default(null),

  category: Joi.string().trim().allow(null, "").default(null),

  attributes: Joi.object().default({}),

  searchTerms: Joi.array().items(Joi.string().trim().min(1)).default([]),

  confidence: Joi.number().min(0).max(1).required(),
}).required();
