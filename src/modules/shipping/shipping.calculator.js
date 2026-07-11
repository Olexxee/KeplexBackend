// modules/shipping/shipping.calculator.js

// ============================================================================
// PRIVATE HELPERS (PURE FUNCTIONS)
// ============================================================================

/**
 * Safely convert a value to number, defaulting to 0
 */
const toNumber = (value) => Number(value || 0);

/**
 * Round a number to specified decimal places
 */
const round = (value, decimals = 4) => Number(Number(value).toFixed(decimals));

/**
 * Normalize dimensions from cm to meters
 */
const normalizeDimensions = ({ length, width, height }) => ({
  length: toNumber(length) / 100,
  width: toNumber(width) / 100,
  height: toNumber(height) / 100,
});

/**
 * Calculate CBM (Cubic Meter)
 * Formula: (Length × Width × Height) in meters
 */
const calculateCBM = ({ length, width, height, quantity = 1 }) => {
  const dims = normalizeDimensions({ length, width, height });
  return dims.length * dims.width * dims.height * quantity;
};

/**
 * Calculate volumetric weight based on shipping type
 * SEA: 1 CBM = 1000 kg
 * AIR: 1 CBM = 167 kg
 * EXPRESS: 1 CBM = 200 kg
 * LOCAL: 1 CBM = 250 kg
 */
const calculateVolumetricWeight = (cbm, shippingType = "SEA") => {
  const factors = {
    SEA: 1000,
    AIR: 167,
    EXPRESS: 200,
    LOCAL: 250,
    IMPORT: 167,
    DIGITAL: 0,
  };

  return cbm * (factors[shippingType] || 1000);
};

/**
 * Determine chargeable weight (actual vs volumetric)
 */
const calculateChargeableWeight = ({ actualWeight, volumetricWeight }) =>
  Math.max(actualWeight, volumetricWeight);

/**
 * Calculate subtotal for an item
 */
const calculateSubtotal = ({ quantity, unitPrice }) =>
  toNumber(unitPrice) * quantity;

// ============================================================================
// PUBLIC METHODS (PURE CALCULATIONS)
// ============================================================================

/**
 * Calculate logistics metrics for a single item
 *
 * Input:
 * {
 *   quantity: number,
 *   unitPrice: number,
 *   shippingType: string (SEA | AIR | LOCAL | IMPORT | EXPRESS | DIGITAL),
 *   actualWeight: number (kg),
 *   length: number (cm),
 *   width: number (cm),
 *   height: number (cm)
 * }
 *
 * Output:
 * {
 *   quantity,
 *   subtotal,
 *   cbm,
 *   actualWeight,
 *   volumetricWeight,
 *   chargeableWeight,
 *   ...originalItem
 * }
 */
const calculateItem = (item) => {
  const quantity = toNumber(item.quantity);
  const shippingType = item.shippingType || "LOCAL";
  const unitPrice = toNumber(item.unitPrice);

  const cbm = calculateCBM({
    length: item.length,
    width: item.width,
    height: item.height,
    quantity,
  });

  const actualWeight = toNumber(item.actualWeight) * quantity;

  const volumetricWeight = calculateVolumetricWeight(cbm, shippingType);

  const chargeableWeight = calculateChargeableWeight({
    actualWeight,
    volumetricWeight,
  });

  const subtotal = calculateSubtotal({ quantity, unitPrice });

  return {
    ...item,
    quantity,
    subtotal: round(subtotal, 2),
    cbm: round(cbm),
    actualWeight: round(actualWeight, 2),
    volumetricWeight: round(volumetricWeight, 2),
    chargeableWeight: round(chargeableWeight, 2),
  };
};

/**
 * Calculate logistics metrics for multiple items
 *
 * Input: Array of items
 * Output: Array of enriched items with logistics metrics
 */
const calculateItems = (items = []) => items.map(calculateItem);

/**
 * Calculate logistics metrics grouped by fulfillment type
 *
 * Input: { LOCAL: [...], IMPORT: [...], PREORDER: [...], DIGITAL: [...] }
 * Output: Same structure with calculated metrics for each group
 */
const calculateFulfillment = (groups = {}) => {
  const result = {};

  for (const [type, items] of Object.entries(groups)) {
    const calculated = calculateItems(items);

    result[type] = {
      items: calculated,
      totalCBM: round(calculated.reduce((sum, item) => sum + item.cbm, 0)),
      totalActualWeight: round(
        calculated.reduce((sum, item) => sum + item.actualWeight, 0),
        2,
      ),
      totalChargeableWeight: round(
        calculated.reduce((sum, item) => sum + item.chargeableWeight, 0),
        2,
      ),
      subtotal: round(
        calculated.reduce((sum, item) => sum + item.subtotal, 0),
        2,
      ),
    };
  }

  return result;
};

/**
 * Calculate order-level logistics metrics
 *
 * Input: Array of items
 * Output: Only logistics metrics (NO pricing)
 */
const calculateOrder = (items = []) => {
  const calculated = calculateItems(items);

  const subtotal = calculated.reduce((sum, item) => sum + item.subtotal, 0);
  const totalCBM = calculated.reduce((sum, item) => sum + item.cbm, 0);
  const totalActualWeight = calculated.reduce(
    (sum, item) => sum + item.actualWeight,
    0,
  );
  const totalChargeableWeight = calculated.reduce(
    (sum, item) => sum + item.chargeableWeight,
    0,
  );

  return {
    items: calculated,
    subtotal: round(subtotal, 2),
    totalCBM: round(totalCBM),
    totalActualWeight: round(totalActualWeight, 2),
    totalChargeableWeight: round(totalChargeableWeight, 2),
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export const ShippingCalculator = {
  calculateItem,
  calculateItems,
  calculateFulfillment,
  calculateOrder,
};
