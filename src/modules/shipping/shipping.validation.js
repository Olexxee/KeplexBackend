import Joi from "joi";

const decimalField = Joi.number()
  .min(0)
  .optional();

const nullableDecimalField = Joi.number()
  .min(0)
  .allow(null)
  .optional();

export const createShippingConfigSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required(),

  status: Joi.string()
    .valid("ACTIVE", "INACTIVE")
    .optional(),

  pricePerKg: decimalField,

  pricePerCBM: decimalField,

  handlingFee: decimalField,

  minCharge: decimalField,

  freeShippingThreshold:
    nullableDecimalField,
});

export const updateShippingConfigSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional(),

  status: Joi.string()
    .valid("ACTIVE", "INACTIVE")
    .optional(),

  pricePerKg: decimalField,

  pricePerCBM: decimalField,

  handlingFee: decimalField,

  minCharge: decimalField,

  freeShippingThreshold:
    nullableDecimalField,
}).min(1);

export const createShippingRuleSchema = Joi.object({
  configurationId: Joi.string()
    .trim()
    .required(),

  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required(),

  type: Joi.string()
    .valid(
      "DEFAULT",
      "LOCAL",
      "IMPORT",
      "SEA",
      "AIR",
      "DIGITAL",
    )
    .optional(),

  isActive: Joi.boolean()
    .optional(),

  minSubtotal:
    nullableDecimalField,

  maxSubtotal:
    nullableDecimalField,

  minWeight:
    nullableDecimalField,

  maxWeight:
    nullableDecimalField,

  baseRate: decimalField,

  ratePerKg: decimalField,

  ratePerCBM: decimalField,

  priority: Joi.number()
    .integer()
    .min(0)
    .optional(),
});

export const updateShippingRuleSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional(),

  type: Joi.string()
    .valid(
      "DEFAULT",
      "LOCAL",
      "IMPORT",
      "SEA",
      "AIR",
      "DIGITAL",
    )
    .optional(),

  isActive: Joi.boolean()
    .optional(),

  minSubtotal:
    nullableDecimalField,

  maxSubtotal:
    nullableDecimalField,

  minWeight:
    nullableDecimalField,

  maxWeight:
    nullableDecimalField,

  baseRate: decimalField,

  ratePerKg: decimalField,

  ratePerCBM: decimalField,

  priority: Joi.number()
    .integer()
    .min(0)
    .optional(),
}).min(1);

export const shippingQuoteSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        variantId: Joi.string()
          .trim()
          .optional(),

        quantity: Joi.number()
          .integer()
          .min(1)
          .required(),

        unitPrice: Joi.number()
          .min(0)
          .required(),

        shippingType: Joi.string()
          .valid(
            "LOCAL",
            "IMPORT",
            "SEA",
            "AIR",
            "DIGITAL",
          )
          .optional(),

        fulfillmentType: Joi.string()
          .valid(
            "LOCAL",
            "IMPORT",
            "PREORDER",
            "DIGITAL",
          )
          .optional(),

        length: nullableDecimalField,

        width: nullableDecimalField,

        height: nullableDecimalField,

        actualWeight:
          nullableDecimalField,

        weight:
          nullableDecimalField,
      }).required(),
    )
    .min(1)
    .required(),

  destination: Joi.object({
    addressId: Joi.string()
      .trim()
      .optional(),

    country: Joi.string()
      .trim()
      .allow("")
      .optional(),

    state: Joi.string()
      .trim()
      .allow("")
      .optional(),

    city: Joi.string()
      .trim()
      .allow("")
      .optional(),
  })
    .allow(null)
    .optional(),
});

export const variantCBMSchema = Joi.object({
  length: nullableDecimalField,

  width: nullableDecimalField,

  height: nullableDecimalField,

  quantity: Joi.number()
    .integer()
    .min(1)
    .optional(),

  actualWeight:
    nullableDecimalField,

  shippingType: Joi.string()
    .valid(
      "LOCAL",
      "IMPORT",
      "SEA",
      "AIR",
      "DIGITAL",
    )
    .optional(),
});

export const orderCBMSchema = Joi.object({
  orderId: Joi.string()
    .trim()
    .required(),

  items: Joi.array()
    .items(
      Joi.object({
        variantId: Joi.string()
          .optional(),

        quantity: Joi.number()
          .integer()
          .min(1)
          .required(),

        unitPrice: Joi.number()
          .min(0)
          .required(),

        shippingType: Joi.string()
          .valid(
            "LOCAL",
            "IMPORT",
            "SEA",
            "AIR",
            "DIGITAL",
          )
          .optional(),

        length: nullableDecimalField,

        width: nullableDecimalField,

        height: nullableDecimalField,

        actualWeight:
          nullableDecimalField,
      }),
    )
    .min(1)
    .required(),
});

