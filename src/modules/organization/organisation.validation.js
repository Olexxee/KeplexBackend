import Joi from "joi";

export const upsertOrganisationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  slug: Joi.string().trim().lowercase().min(2).max(80).required(),
  email: Joi.string().trim().lowercase().email().allow(null, "").optional(),
  phone: Joi.string().trim().allow(null, "").optional(),
  logoUrl: Joi.string().uri().allow(null, "").optional(),
  address: Joi.string().trim().allow(null, "").optional(),
  socialLinks: Joi.object().optional(),
  settings: Joi.object().optional(),
});
