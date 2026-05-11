import Joi from "joi";

export const createStaffSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().lowercase().email().required(),
  phone: Joi.string().trim().allow(null, "").optional(),
  password: Joi.string().min(6).max(100).required(),
  role: Joi.string().valid("ADMIN", "STAFF").default("STAFF"),
});

export const updateUserRoleSchema = Joi.object({
  role: Joi.string().valid("ADMIN", "STAFF", "CUSTOMER").required(),
});

export const updateUserStatusSchema = Joi.object({
  status: Joi.string().valid("ACTIVE", "SUSPENDED").required(),
});

export const userIdSchema = Joi.object({
  id: Joi.string().required(),
});
