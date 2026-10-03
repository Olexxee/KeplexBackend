import Joi from "joi";

const itemSchema = Joi.object({
  variantId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
});

export const createInstallmentPlanSchema = Joi.object({
  sourceType: Joi.string().valid("PRODUCT", "CART").required(),
  items: Joi.when("sourceType", {
    is: "PRODUCT",
    then: Joi.array().items(itemSchema).min(1).required(),
    otherwise: Joi.forbidden(),
  }),
  cartItemIds: Joi.when("sourceType", {
    is: "CART",
    then: Joi.array().items(Joi.string().required()).min(1).required(),
    otherwise: Joi.forbidden(),
  }),
  addressId: Joi.string().required(),
  installmentCount: Joi.number().integer().min(2).max(24).required(),
  installmentIntervalDays: Joi.number().integer().min(1).max(90).required(),
});

export const initializeInstallmentPaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
});
