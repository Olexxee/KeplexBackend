import Joi from "joi";

export const updateNotificationPreferencesSchema = Joi.object({
  orderEmails: Joi.boolean(),

  orderStatusEmails: Joi.boolean(),

  trainingEmails: Joi.boolean(),

  marketingEmails: Joi.boolean(),
})
  .min(1)
  .unknown(false);
