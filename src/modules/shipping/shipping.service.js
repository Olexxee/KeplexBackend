// modules/shipping/shipping.service.js
import { NotFoundError, BadRequestError } from "../../classes/errorClasses.js";
import { ShippingCalculator } from "./shipping.calculator.js";
import * as shippingDb from "./shipping.db.js";
import * as variantDb from "../variants/variant.db.js";

// ============================================================================
// SHIPPING CONFIGURATION CRUD
// ============================================================================

export const createShippingConfig = async (payload) => {
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

export const getActiveShippingConfig = async () => {
  return shippingDb.getActiveShippingConfig();
};

// ============================================================================
// SHIPPING QUOTE (Pricing + Business Logic)
// ============================================================================

/**
 * Calculate shipping quote with pricing
 * This is where BUSINESS pricing logic lives
 */
export const calculateShippingQuote = async (
  items,
  destination,
  options = {},
) => {
  // 1. Calculate pure logistics metrics
  const metrics = ShippingCalculator.calculateOrder(items);

  // 2. Load shipping configuration
  const config = await shippingDb.getActiveShippingConfig();
  if (!config) {
    throw new BadRequestError("No active shipping configuration found");
  }

  // 3. Load shipping rules
  const rules = await shippingDb.findShippingRules({
    isActive: true,
  });

  // 4. Apply pricing rules based on destination and metrics
  const shippingCost = calculateShippingCost({
    metrics,
    config,
    rules,
    destination,
    options,
  });

  // 5. Return complete shipping quote
  return {
    ...metrics,
    shippingCost: round(shippingCost, 2),
    grandTotal: round(metrics.subtotal + shippingCost, 2),
    config: {
      id: config.id,
      name: config.name,
      type: config.type,
      estimatedDeliveryMin: config.deliveryEstimateMin,
      estimatedDeliveryMax: config.deliveryEstimateMax,
    },
    rulesApplied: rules.map((r) => r.name),
  };
};

/**
 * Calculate shipping cost by applying business rules
 * This is where all pricing logic lives
 */
const calculateShippingCost = ({
  metrics,
  config,
  rules,
  destination,
  options,
}) => {
  const { totalChargeableWeight, totalCBM } = metrics;
  let cost = 0;

  // Rule 1: Free shipping threshold
  if (
    config.freeShippingThreshold &&
    metrics.subtotal >= config.freeShippingThreshold
  ) {
    return 0;
  }

  // Rule 2: Apply shipping rules in priority order
  for (const rule of rules) {
    if (isRuleApplicable(rule, { metrics, destination, options })) {
      cost = calculateRuleCost(rule, { metrics, config });
      break;
    }
  }

  // Rule 3: Default pricing using config
  if (cost === 0) {
    if (config.type === "SEA") {
      cost = totalCBM * (config.pricePerCBM || 0);
    } else {
      cost = totalChargeableWeight * (config.pricePerKg || 0);
    }
  }

  // Rule 4: Apply handling fee
  if (config.handlingFee) {
    cost += Number(config.handlingFee);
  }

  // Rule 5: Apply minimum charge
  if (config.minCharge) {
    cost = Math.max(cost, Number(config.minCharge));
  }

  return cost;
};

/**
 * Check if a shipping rule applies to the current order
 */
const isRuleApplicable = (rule, { metrics, destination, options }) => {
  // Zone rules
  if (rule.type === "ZONE" && rule.zone) {
    const zoneMatches = destination?.zone === rule.zone;
    if (!zoneMatches) return false;
  }

  // Weight rules
  if (rule.minWeight && metrics.totalChargeableWeight < rule.minWeight)
    return false;
  if (rule.maxWeight && metrics.totalChargeableWeight > rule.maxWeight)
    return false;

  // Order amount rules
  if (rule.minOrderAmount && metrics.subtotal < rule.minOrderAmount)
    return false;
  if (rule.maxOrderAmount && metrics.subtotal > rule.maxOrderAmount)
    return false;

  return true;
};

/**
 * Calculate cost based on a specific rule
 */
const calculateRuleCost = (rule, { metrics, config }) => {
  let cost = Number(rule.baseRate) || 0;

  // Add per-kg rate if applicable
  if (rule.ratePerKg) {
    cost += metrics.totalChargeableWeight * Number(rule.ratePerKg);
  }

  // If rule doesn't have ratePerKg, fall back to config price
  if (!rule.ratePerKg && config.pricePerKg) {
    cost += metrics.totalChargeableWeight * Number(config.pricePerKg);
  }

  return cost;
};

/**
 * Round a number to 2 decimal places
 */
const round = (value, decimals = 2) => Number(Number(value).toFixed(decimals));

// ============================================================================
// LEGACY METHODS (Keep for backward compatibility)
// ============================================================================

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
      unitPrice: cartItem.unitPriceSnapshot,
      length: variant?.length || null,
      width: variant?.width || null,
      height: variant?.height || null,
      actualWeight: variant?.actualWeight || 0,
      shippingType: variant?.shippingType || "LOCAL",
      fulfillmentType: variant?.fulfillmentType || "LOCAL",
    };
  });

  // Calculate shipping metrics
  const metrics = ShippingCalculator.calculateOrder(items);

  // Get shipping configuration
  const config = await shippingDb.getActiveShippingConfig();

  // Calculate shipping cost
  const rules = await shippingDb.findShippingRules({ isActive: true });
  const shippingCost = calculateShippingCost({
    metrics,
    config,
    rules,
    destination: null,
    options: {},
  });

  return {
    ...metrics,
    shippingCost: round(shippingCost, 2),
    grandTotal: round(metrics.subtotal + shippingCost, 2),
    config,
    items,
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

  const item = {
    quantity: 1,
    unitPrice: Number(variant.price),
    actualWeight: Number(variant.actualWeight),
    length: Number(variant.length),
    width: Number(variant.width),
    height: Number(variant.height),
    shippingType: variant.shippingType || "SEA",
  };

  const result = ShippingCalculator.calculateItem(item);

  return {
    variantId,
    sku: variant.sku,
    cbm: result.cbm,
    volumetricWeight: result.volumetricWeight,
    chargeableWeight: result.chargeableWeight,
    dimensions: {
      length: variant.length,
      width: variant.width,
      height: variant.height,
    },
  };
};

export const updateOrderWithCBM = async (orderId, cbmData) => {
  return shippingDb.updateOrderCBM(orderId, cbmData);
};
