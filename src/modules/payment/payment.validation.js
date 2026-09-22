import Joi from "joi";

export const initializeOrderPaymentSchema =
Joi.object({
provider: Joi.string()
.valid("PAYSTACK", "PAWAPAY")
.default("PAYSTACK"),

phoneNumber: Joi.when("provider", {
  is: "PAWAPAY",
  then: Joi.string()
    .trim()
    .pattern(/^\+?[1-9]\d{7,14}$/)
    .required(),
  otherwise: Joi.string()
    .trim()
    .allow("", null)
    .optional(),
}),

customerMessage: Joi.when(
  "provider",
  {
    is: "PAWAPAY",
    then: Joi.string()
      .trim()
      .min(4)
      .max(22)
      .optional(),
    otherwise: Joi.forbidden(),
  },
),

});
