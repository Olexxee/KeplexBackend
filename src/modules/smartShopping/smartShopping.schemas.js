import Joi from "joi";

export const smartShoppingRequestSchema = Joi.object({
  message: Joi.string().trim().min(2).max(2000).required(),

  destination: Joi.object({
    country: Joi.string().trim().max(100).allow("", null),
    state: Joi.string().trim().max(100).allow("", null),
    city: Joi.string().trim().max(100).allow("", null),
  })
    .default(null)
    .allow(null),
}).required();

export const smartShoppingIntentSchema = Joi.object({
  intent: Joi.string()
    .valid(
      "product_discovery",
      "gift_discovery",
      "product_search",
      "product_comparison",
      "refinement",
      "general_shopping",
    )
    .required(),

  productType: Joi.string().trim().allow(null, "").default(null),

  category: Joi.string().trim().allow(null, "").default(null),

  brand: Joi.string().trim().allow(null, "").default(null),

  model: Joi.string().trim().allow(null, "").default(null),

  useCase: Joi.string().trim().allow(null, "").default(null),

  recipient: Joi.string().trim().allow(null, "").default(null),

  budget: Joi.object({
    currency: Joi.string().trim().default("NGN"),
    min: Joi.number().min(0).allow(null).default(null),
    max: Joi.number().min(0).allow(null).default(null),
  }).default({
    currency: "NGN",
    min: null,
    max: null,
  }),

  attributes: Joi.object().default({}),

  preferredColors: Joi.array().items(Joi.string().trim().min(1)).default([]),

  preferredSizes: Joi.array().items(Joi.string().trim().min(1)).default([]),

  quantity: Joi.number().integer().min(1).default(1),

  urgency: Joi.string().valid("none", "low", "medium", "high").default("none"),

  deliveryRequirement: Joi.object({
    preference: Joi.string()
      .valid("none", "fast", "standard", "economical")
      .default("none"),

    requiredBy: Joi.string().trim().allow(null, "").default(null),
  }).default({
    preference: "none",
    requiredBy: null,
  }),

  searchTerms: Joi.array().items(Joi.string().trim().min(1)).default([]),

  exclusions: Joi.array().items(Joi.string().trim().min(1)).default([]),
}).required();
