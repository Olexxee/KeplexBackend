import {
  BadRequestError,
  NotFoundError,
} from "../../classes/errorClasses.js";

import * as shippingDb from "./shipping.db.js";
import { ShippingCalculator } from "./shipping.calculator.js";

// ============================================================
// HELPERS
// ============================================================

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;

  return (
    Math.round((toNumber(value) + Number.EPSILON) * factor) /
    factor
  );
};

const normalizeShippingType = (type) => {
  return String(type || "LOCAL").toUpperCase();
};

const normalizeItems = (
  items = [],
  { allowEmpty = false } = {},
) => {
  if (!Array.isArray(items)) {
    throw new BadRequestError(
      "Shipping items must be an array",
    );
  }

  if (!allowEmpty && items.length === 0) {
    throw new BadRequestError(
      "Shipping calculation requires at least one item",
    );
  }

  return items;
};

// ============================================================
// CONFIGURATION
// ============================================================

export const createShippingConfig = async (data) => {
  if (!data?.name?.trim()) {
    throw new BadRequestError(
      "Shipping configuration name is required",
    );
  }

  return shippingDb.createShippingConfig({
    ...data,

    name: data.name.trim(),

    pricePerKg: toNumber(data.pricePerKg),
    pricePerCBM: toNumber(data.pricePerCBM),
    handlingFee: toNumber(data.handlingFee),
    minCharge: toNumber(data.minCharge),

    freeShippingThreshold:
      data.freeShippingThreshold == null
        ? null
        : toNumber(data.freeShippingThreshold),
  });
};

export const updateShippingConfig = async (id, data) => {
  const existing =
    await shippingDb.findShippingConfigById(id);

  if (!existing) {
    throw new NotFoundError(
      "Shipping configuration not found",
    );
  }

  const updateData = {
    ...data,
  };

  if ("name" in data) {
    if (!data.name?.trim()) {
      throw new BadRequestError(
        "Shipping configuration name is required",
      );
    }

    updateData.name = data.name.trim();
  }

  if ("pricePerKg" in data) {
    updateData.pricePerKg = toNumber(data.pricePerKg);
  }

  if ("pricePerCBM" in data) {
    updateData.pricePerCBM = toNumber(data.pricePerCBM);
  }

  if ("handlingFee" in data) {
    updateData.handlingFee = toNumber(data.handlingFee);
  }

  if ("minCharge" in data) {
    updateData.minCharge = toNumber(data.minCharge);
  }

  if ("freeShippingThreshold" in data) {
    updateData.freeShippingThreshold =
      data.freeShippingThreshold == null
        ? null
        : toNumber(data.freeShippingThreshold);
  }

  return shippingDb.updateShippingConfig(
    id,
    updateData,
  );
};

export const getShippingConfig = async (id) => {
  const config =
    await shippingDb.findShippingConfigById(id);

  if (!config) {
    throw new NotFoundError(
      "Shipping configuration not found",
    );
  }

  return config;
};

export const getShippingConfigs = async () => {
  return shippingDb.findShippingConfigs();
};

export const getActiveShippingConfig = async () => {
  const config =
    await shippingDb.getActiveShippingConfig();

  if (!config) {
    throw new NotFoundError(
      "No active shipping configuration found",
    );
  }

  return config;
};

// ============================================================
// SHIPPING RULES
// ============================================================

export const createShippingRule = async (data) => {
  if (!data?.name?.trim()) {
    throw new BadRequestError(
      "Shipping rule name is required",
    );
  }

  if (!data.configurationId) {
    throw new BadRequestError(
      "Shipping configuration is required",
    );
  }

  const configuration =
    await shippingDb.findShippingConfigById(
      data.configurationId,
    );

  if (!configuration) {
    throw new NotFoundError(
      "Shipping configuration not found",
    );
  }

  return shippingDb.createShippingRule({
    ...data,

    name: data.name.trim(),

    baseRate: toNumber(data.baseRate),
    ratePerKg: toNumber(data.ratePerKg),
    ratePerCBM: toNumber(data.ratePerCBM),

    minSubtotal:
      data.minSubtotal == null
        ? null
        : toNumber(data.minSubtotal),

    maxSubtotal:
      data.maxSubtotal == null
        ? null
        : toNumber(data.maxSubtotal),

    minWeight:
      data.minWeight == null
        ? null
        : toNumber(data.minWeight),

    maxWeight:
      data.maxWeight == null
        ? null
        : toNumber(data.maxWeight),

    priority:
      data.priority == null
        ? 0
        : Number(data.priority),
  });
};

export const updateShippingRule = async (
  id,
  data,
) => {
  const existing =
    await shippingDb.findShippingRuleById(id);

  if (!existing) {
    throw new NotFoundError(
      "Shipping rule not found",
    );
  }

  const updateData = {
    ...data,
  };

  if ("name" in data) {
    if (!data.name?.trim()) {
      throw new BadRequestError(
        "Shipping rule name is required",
      );
    }

    updateData.name = data.name.trim();
  }

  if ("baseRate" in data) {
    updateData.baseRate = toNumber(data.baseRate);
  }

  if ("ratePerKg" in data) {
    updateData.ratePerKg = toNumber(data.ratePerKg);
  }

  if ("ratePerCBM" in data) {
    updateData.ratePerCBM = toNumber(data.ratePerCBM);
  }

  if ("minSubtotal" in data) {
    updateData.minSubtotal =
      data.minSubtotal == null
        ? null
        : toNumber(data.minSubtotal);
  }

  if ("maxSubtotal" in data) {
    updateData.maxSubtotal =
      data.maxSubtotal == null
        ? null
        : toNumber(data.maxSubtotal);
  }

  if ("minWeight" in data) {
    updateData.minWeight =
      data.minWeight == null
        ? null
        : toNumber(data.minWeight);
  }

  if ("maxWeight" in data) {
    updateData.maxWeight =
      data.maxWeight == null
        ? null
        : toNumber(data.maxWeight);
  }

  if ("priority" in data) {
    const priority = Number(data.priority);

    if (!Number.isFinite(priority)) {
      throw new BadRequestError(
        "Shipping rule priority must be a valid number",
      );
    }

    updateData.priority = priority;
  }

  return shippingDb.updateShippingRule(
    id,
    updateData,
  );
};

export const getShippingRule = async (id) => {
  const rule =
    await shippingDb.findShippingRuleById(id);

  if (!rule) {
    throw new NotFoundError(
      "Shipping rule not found",
    );
  }

  return rule;
};

export const getShippingRules = async (filters = {}) => {
  return shippingDb.findShippingRules(filters);
};

export const deleteShippingRule = async (id) => {
  const existing =
    await shippingDb.findShippingRuleById(id);

  if (!existing) {
    throw new NotFoundError(
      "Shipping rule not found",
    );
  }

  return shippingDb.deleteShippingRule(id);
};

// ============================================================
// RULE MATCHING
// ============================================================

const ruleMatchesMetrics = (rule, metrics) => {
  const subtotal = toNumber(metrics.subtotal);

  const chargeableWeight = toNumber(
    metrics.totalChargeableWeight,
  );

  if (
    rule.minSubtotal != null &&
    subtotal < toNumber(rule.minSubtotal)
  ) {
    return false;
  }

  if (
    rule.maxSubtotal != null &&
    subtotal > toNumber(rule.maxSubtotal)
  ) {
    return false;
  }

  if (
    rule.minWeight != null &&
    chargeableWeight < toNumber(rule.minWeight)
  ) {
    return false;
  }

  if (
    rule.maxWeight != null &&
    chargeableWeight > toNumber(rule.maxWeight)
  ) {
    return false;
  }

  return true;
};

const findApplicableRule = (
  rules,
  shippingType,
  metrics,
) => {
  const normalizedType =
    normalizeShippingType(shippingType);

  const sortedRules = [...rules].sort(
    (a, b) =>
      Number(a.priority || 0) -
      Number(b.priority || 0),
  );

  return (
    sortedRules.find((rule) => {
      if (!rule.isActive) {
        return false;
      }

      const ruleType =
        String(rule.type || "DEFAULT").toUpperCase();

      if (
        ruleType !== "DEFAULT" &&
        ruleType !== normalizedType
      ) {
        return false;
      }

      return ruleMatchesMetrics(
        rule,
        metrics,
      );
    }) || null
  );
};

// ============================================================
// GROUPING
// ============================================================

const groupItemsByShippingType = (items) => {
  const groups = {};

  for (const item of items) {
    const type = normalizeShippingType(
      item.shippingType,
    );

    if (!groups[type]) {
      groups[type] = [];
    }

    groups[type].push(item);
  }

  return groups;
};

const calculateGroupMetrics = (items) => {
  return {
    items,

    subtotal: round(
      items.reduce(
        (sum, item) =>
          sum + toNumber(item.subtotal),
        0,
      ),
      2,
    ),

    totalCBM: round(
      items.reduce(
        (sum, item) =>
          sum + toNumber(item.cbm),
        0,
      ),
      4,
    ),

    totalActualWeight: round(
      items.reduce(
        (sum, item) =>
          sum + toNumber(item.actualWeight),
        0,
      ),
      2,
    ),

    totalChargeableWeight: round(
      items.reduce(
        (sum, item) =>
          sum +
          toNumber(item.chargeableWeight),
        0,
      ),
      2,
    ),
  };
};

// ============================================================
// BASE SHIPPING COST
// ============================================================

const calculateGroupBaseShippingCost = (
  shippingType,
  metrics,
  config,
) => {
  const type =
    normalizeShippingType(shippingType);

  const chargeableWeight =
    toNumber(
      metrics.totalChargeableWeight,
    );

  const cbm =
    toNumber(metrics.totalCBM);

  switch (type) {
    case "SEA":
      return (
        cbm *
        toNumber(config.pricePerCBM)
      );

    case "AIR":
    case "IMPORT":
    case "LOCAL":
      return (
        chargeableWeight *
        toNumber(config.pricePerKg)
      );

    case "DIGITAL":
      return 0;

    default:
      return (
        chargeableWeight *
        toNumber(config.pricePerKg)
      );
  }
};

// ============================================================
// RULE COST
// ============================================================

const calculateRuleCost = (
  rule,
  metrics,
) => {
  const baseRate =
    toNumber(rule.baseRate);

  const weightCost =
    toNumber(
      metrics.totalChargeableWeight,
    ) *
    toNumber(rule.ratePerKg);

  const cbmCost =
    toNumber(metrics.totalCBM) *
    toNumber(rule.ratePerCBM);

  return (
    baseRate +
    weightCost +
    cbmCost
  );
};

// ============================================================
// SHIPPING COST
// ============================================================

export const calculateShippingCost = ({
  items,
  metrics,
  config,
  rules,
}) => {
  const subtotal =
    toNumber(metrics.subtotal);

  // ----------------------------------------------------------
  // NO SHIPPABLE ITEMS
  // ----------------------------------------------------------

  if (!items || items.length === 0) {
    return {
      shippingCost: 0,
      source: "NO_PHYSICAL_SHIPPING",
      rule: null,
      groups: [],
    };
  }

  // ----------------------------------------------------------
  // FREE SHIPPING
  // ----------------------------------------------------------

  if (
    config.freeShippingThreshold != null &&
    subtotal >=
      toNumber(
        config.freeShippingThreshold,
      )
  ) {
    return {
      shippingCost: 0,
      source:
        "FREE_SHIPPING_THRESHOLD",
      rule: null,
      groups: [],
    };
  }

  // ----------------------------------------------------------
  // GROUP BY SHIPPING TYPE
  // ----------------------------------------------------------

  const groups =
    groupItemsByShippingType(items);

  const groupQuotes = [];

  for (const [
    shippingType,
    groupItems,
  ] of Object.entries(groups)) {
    const groupMetrics =
      calculateGroupMetrics(
        groupItems,
      );

    // --------------------------------------------------------
    // DIGITAL PRODUCTS
    // --------------------------------------------------------

    if (
      shippingType === "DIGITAL"
    ) {
      groupQuotes.push({
        shippingType,
        ...groupMetrics,
        shippingCost: 0,
        pricingSource: "DIGITAL",
        rule: null,
      });

      continue;
    }

    const rule =
      findApplicableRule(
        rules,
        shippingType,
        groupMetrics,
      );

    let shippingCost;
    let pricingSource;

    if (rule) {
      shippingCost =
        calculateRuleCost(
          rule,
          groupMetrics,
        );

      pricingSource = "RULE";
    } else {
      shippingCost =
        calculateGroupBaseShippingCost(
          shippingType,
          groupMetrics,
          config,
        );

      pricingSource =
        "CONFIGURATION";
    }

    groupQuotes.push({
      shippingType,

      ...groupMetrics,

      shippingCost:
        round(
          shippingCost,
          2,
        ),

      pricingSource,

      rule: rule
        ? {
            id: rule.id,
            name: rule.name,
            type: rule.type,
            priority:
              rule.priority,
          }
        : null,
    });
  }

  // ----------------------------------------------------------
  // TOTAL RAW SHIPPING
  // ----------------------------------------------------------

  const rawShippingCost =
    groupQuotes.reduce(
      (sum, group) =>
        sum +
        toNumber(
          group.shippingCost,
        ),
      0,
    );

  // ----------------------------------------------------------
  // PHYSICAL SHIPPING CHECK
  // ----------------------------------------------------------

  const hasPhysicalShipping =
    groupQuotes.some(
      (group) =>
        group.shippingType !==
        "DIGITAL",
    );

  if (!hasPhysicalShipping) {
    return {
      shippingCost: 0,
      source:
        "NO_PHYSICAL_SHIPPING",
      rule: null,
      groups: groupQuotes,
    };
  }

  // ----------------------------------------------------------
  // ORDER-LEVEL HANDLING FEE
  // ----------------------------------------------------------

  let shippingCost =
    rawShippingCost;

  shippingCost +=
    toNumber(
      config.handlingFee,
    );

  // ----------------------------------------------------------
  // MINIMUM SHIPPING CHARGE
  // ----------------------------------------------------------

  if (
    shippingCost > 0 &&
    toNumber(config.minCharge) > 0
  ) {
    shippingCost =
      Math.max(
        shippingCost,
        toNumber(
          config.minCharge,
        ),
      );
  }

  return {
    shippingCost:
      round(
        shippingCost,
        2,
      ),

    source:
      groupQuotes.some(
        (group) =>
          group.pricingSource ===
          "RULE",
      )
        ? "RULES"
        : "CONFIGURATION",

    rule: null,

    groups:
      groupQuotes,
  };
};

// ============================================================
// PUBLIC SHIPPING QUOTE
// ============================================================

export const calculateShippingQuote = async ({
  items,
  destination = null,
}) => {
  const normalizedItems =
    normalizeItems(items, {
      allowEmpty: true,
    });

  // ----------------------------------------------------------
  // NO SHIPPABLE ITEMS
  // ----------------------------------------------------------

  if (normalizedItems.length === 0) {
    return {
      destination,

      items: [],

      subtotal: 0,

      totalCBM: 0,

      totalActualWeight: 0,

      totalChargeableWeight: 0,

      shippingCost: 0,

      grandTotal: 0,

      pricingSource:
        "NO_PHYSICAL_SHIPPING",

      groups: [],

      configuration: null,
    };
  }

  // ----------------------------------------------------------
  // CALCULATE LOGISTICS
  // ----------------------------------------------------------

  const calculated =
    ShippingCalculator.calculateOrder(
      normalizedItems,
    );

  // ----------------------------------------------------------
  // LOAD SHIPPING CONFIG
  // ----------------------------------------------------------

  const config =
    await shippingDb.getActiveShippingConfig();

  if (!config) {
    throw new NotFoundError(
      "No active shipping configuration found",
    );
  }

  // ----------------------------------------------------------
  // CALCULATE SHIPPING COST
  // ----------------------------------------------------------

  const quote =
    calculateShippingCost({
      items:
        calculated.items,

      metrics:
        calculated,

      config,

      rules:
        config.rules || [],
    });

  return {
    destination,

    items:
      calculated.items,

    subtotal:
      calculated.subtotal,

    totalCBM:
      calculated.totalCBM,

    totalActualWeight:
      calculated.totalActualWeight,

    totalChargeableWeight:
      calculated.totalChargeableWeight,

    shippingCost:
      quote.shippingCost,

    grandTotal:
      round(
        calculated.subtotal +
          quote.shippingCost,
        2,
      ),

    pricingSource:
      quote.source,

    groups:
      quote.groups,

    configuration: {
      id: config.id,
      name: config.name,
      status: config.status,
    },
  };
};

// ============================================================
// CART SHIPPING
// ============================================================

export const calculateShippingForCart = async ({
  cartItems,
  destination = null,
}) => {
  if (
    !Array.isArray(cartItems) ||
    cartItems.length === 0
  ) {
    throw new BadRequestError(
      "Cart is empty",
    );
  }

  const items = cartItems.map((item) => {
    const variant =
      item.variant;

    if (!variant) {
      throw new BadRequestError(
        "Cart item variant is missing",
      );
    }

    return {
      variantId:
        item.variantId,

      quantity:
        toNumber(item.quantity),

      unitPrice:
        toNumber(
          item.unitPriceSnapshot,
        ),

      shippingType:
        variant.shippingType ||
        "LOCAL",

      fulfillmentType:
        variant.fulfillmentType ||
        "LOCAL",

      length:
        variant.length,

      width:
        variant.width,

      height:
        variant.height,

      actualWeight:
        variant.actualWeight,

      weight:
        variant.weight,
    };
  });

  return calculateShippingQuote({
    items,
    destination,
  });
};

// ============================================================
// VARIANT CBM
// ============================================================

export const calculateCBMForVariant = ({
  length,
  width,
  height,
  quantity = 1,
  actualWeight = 0,
  shippingType = "LOCAL",
}) => {
  return ShippingCalculator.calculateItem({
    length,
    width,
    height,
    quantity,
    actualWeight,
    shippingType,
    unitPrice: 0,
  });
};

// ============================================================
// ORDER CBM
// ============================================================

export const updateOrderWithCBM = async ({
  orderId,
  items,
  updatedBy = null,
}) => {
  const calculated =
    ShippingCalculator.calculateOrder(
      normalizeItems(items),
    );

  return shippingDb.updateOrderCBM(
    orderId,
    {
      totalCBM:
        calculated.totalCBM,

      totalChargeableWeight:
        calculated.totalChargeableWeight,

      items:
        calculated.items,

      updatedBy,
    },
  );
};

// ============================================================
// STOREFRONT
// ============================================================
//
// Public read used by the customer-facing shipping page. Returns the
// active configuration with only its active rules. Returns `null`
// rather than throwing when nothing is configured — the storefront
// renders a friendly empty state instead of a 404.

export const getStorefrontShipping = async () => {
  const config = await shippingDb.getActiveShippingConfig();

  if (!config) {
    return null;
  }

  return {
    id: config.id,
    name: config.name,
    status: config.status,

    pricePerKg: config.pricePerKg,
    pricePerCBM: config.pricePerCBM,
    handlingFee: config.handlingFee,
    minCharge: config.minCharge,
    freeShippingThreshold: config.freeShippingThreshold,

    rules: (config.rules ?? [])
      .filter((rule) => rule.isActive)
      .map((rule) => ({
        id: rule.id,
        name: rule.name,
        type: rule.type,
        isActive: rule.isActive,

        minSubtotal: rule.minSubtotal,
        maxSubtotal: rule.maxSubtotal,
        minWeight: rule.minWeight,
        maxWeight: rule.maxWeight,

        baseRate: rule.baseRate,
        ratePerKg: rule.ratePerKg,
        ratePerCBM: rule.ratePerCBM,

        priority: rule.priority,
      })),
  };
};