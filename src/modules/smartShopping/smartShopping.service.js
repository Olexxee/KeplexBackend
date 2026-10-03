import { BadRequestError } from "../../classes/errorClasses.js";
import * as shippingService from "../shipping/shipping.service.js";
import { extractShoppingIntent } from "./smartShopping.intent.js";
import { findSmartShoppingProducts } from "./smartShopping.matcher.js";
import { mapShoppingProduct } from "./smartShopping.mapper.js";

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const buildShippingItem = (result, quantity) => {
  const { variant } = result;

  return {
    variantId: variant.id,

    quantity,

    unitPrice: toNumber(variant.price),

    shippingType: variant.shippingType || "LOCAL",

    fulfillmentType: variant.fulfillmentType || "LOCAL",

    length: variant.length,
    width: variant.width,
    height: variant.height,

    actualWeight: variant.actualWeight,

    weight: variant.weight,
  };
};

const calculateProductShipping = async (result, intent, destination) => {
  try {
    const shipping = await shippingService.calculateShippingQuote({
      items: [buildShippingItem(result, intent.quantity)],

      destination,
    });

    return {
      status: "CALCULATED",

      shippingCost: shipping.shippingCost,

      grandTotal: shipping.grandTotal,

      pricingSource: shipping.pricingSource,

      totalCBM: shipping.totalCBM,

      totalActualWeight: shipping.totalActualWeight,

      totalChargeableWeight: shipping.totalChargeableWeight,

      groups: shipping.groups,
    };
  } catch (error) {
    console.error("Smart Shopping shipping calculation failed:", error);

    return {
      status: "UNAVAILABLE",
      shippingCost: null,
      grandTotal: null,
      pricingSource: null,
      totalCBM: null,
      totalActualWeight: null,
      totalChargeableWeight: null,
      groups: [],
    };
  }
};

const buildSummary = ({ intent, products }) => {
  if (!products.length) {
    if (intent.productType) {
      return `I couldn't find an in-stock ${intent.productType} matching those requirements in the current catalog.`;
    }

    return "I couldn't find an in-stock product matching those requirements in the current catalog.";
  }

  if (products.length === 1) {
    return "I found one product that closely matches what you're looking for.";
  }

  return `I found ${products.length} products that match your shopping requirements.`;
};

export const smartShop = async ({ message, destination = null }) => {
  if (!message?.trim()) {
    throw new BadRequestError("Shopping request is required");
  }

  const intent = await extractShoppingIntent(message);

  const matches = await findSmartShoppingProducts(intent);

  const products = [];

  for (const match of matches.slice(0, 8)) {
    const shipping = await calculateProductShipping(match, intent, destination);

    products.push(
      mapShoppingProduct({
        ...match,
        shipping,
      }),
    );
  }

  return {
    intent: {
      type: intent.intent,
      productType: intent.productType,
      category: intent.category,
      brand: intent.brand,
      model: intent.model,
      useCase: intent.useCase,
      recipient: intent.recipient,

      budget: intent.budget,

      attributes: intent.attributes,

      preferredColors: intent.preferredColors,

      preferredSizes: intent.preferredSizes,

      quantity: intent.quantity,

      urgency: intent.urgency,

      deliveryRequirement: intent.deliveryRequirement,

      exclusions: intent.exclusions,
    },

    summary: buildSummary({
      intent,
      products,
    }),

    products,

    meta: {
      total: products.length,
      shippingCalculated: products.some(
        (product) => product.shipping?.status === "CALCULATED",
      ),
    },
  };
};
