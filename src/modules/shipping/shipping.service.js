// modules/shipping/shipping.service.js
import { NotFoundError, BadRequestError } from "../../classes/errorClasses.js";
import { CBMCalculator } from "./cbm.calculator.js";
import * as shippingDb from "./shipping.db.js";
import * as variantDb from "../variants/variant.db.js";

export const createShippingConfig = async (payload) => {
  // Validate configuration
  const { type } = payload;

  if (type === "SEA" && !payload.pricePerCBM) {
    throw new BadRequestError("Sea freight requires pricePerCBM");
  }

  if (type !== "SEA" && !payload.pricePerKg) {
    throw new BadRequestError("Shipping requires pricePerKg");
  }

  return shippingDb.createShippingConfig(payload);
};

export const updateShippingConfig = async (id, payload) => {
  const config = await shippingDb.findShippingConfigById(id);
  if (!config) {
    throw new NotFoundError("Shipping configuration not found");
  }

  return shippingDb.updateShippingConfig(id, payload);
};

export const getShippingConfig = async (id) => {
  const config = await shippingDb.findShippingConfigById(id);
  if (!config) {
    throw new NotFoundError("Shipping configuration not found");
  }
  return config;
};

export const getShippingConfigs = async (filters) => {
  return shippingDb.findShippingConfigs(filters);
};

export const calculateShippingForCart = async (cartItems) => {
  // Fetch variants for all cart items
  const variantIds = cartItems.map((item) => item.variantId);
  const variants = await variantDb.findVariantsByIds(variantIds);

  // Build items array with dimensions
  const items = cartItems.map((cartItem) => {
    const variant = variants.find((v) => v.id === cartItem.variantId);
    return {
      variantId: cartItem.variantId,
      name: variant?.product?.name || "Unknown",
      quantity: cartItem.quantity,
      price: cartItem.unitPriceSnapshot,
      length: variant?.length || null,
      width: variant?.width || null,
      height: variant?.height || null,
      actualWeight: variant?.actualWeight || 0,
      shippingType: variant?.shippingType || "LOCAL",
      fulfillmentType: variant?.fulfillmentType || "LOCAL",
    };
  });

  // Get shipping configuration
  const config = await shippingDb.getActiveShippingConfig();

  // Calculate shipping
  const shippingCosts = CBMCalculator.calculateOrderShipping(items, config);

  return {
    shippingCosts,
    items,
    config,
  };
};

export const calculateCBMForVariant = async (variantId) => {
  const variant = await variantDb.findVariantById(variantId);
  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  if (!variant.length || !variant.width || !variant.height) {
    throw new BadRequestError("Variant dimensions not set");
  }

  const cbm = CBMCalculator.calculateCBM({
    length: variant.length,
    width: variant.width,
    height: variant.height,
  });

  const volumetricWeight = CBMCalculator.calculateVolumetricWeight(
    cbm,
    variant.shippingType || "SEA",
  );

  const chargeableWeight = CBMCalculator.calculateChargeableWeight(
    variant.actualWeight,
    cbm,
    variant.shippingType || "SEA",
  );

  return {
    variantId,
    sku: variant.sku,
    cbm,
    volumetricWeight,
    chargeableWeight,
    dimensions: {
      length: variant.length,
      width: variant.width,
      height: variant.height,
    },
  };
};

export const updateOrderWithCBM = async (orderId, cbmData) => {
  // Update order with CBM information
  // This is triggered by admin/shipping team after measurement
  return shippingDb.updateOrderCBM(orderId, cbmData);
};
