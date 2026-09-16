// ============================================================================
// PRIVATE HELPERS
// ============================================================================

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const round = (value, decimals = 4) => {
  const factor = 10 ** decimals;

  return Math.round(
    (toNumber(value) + Number.EPSILON) * factor,
  ) / factor;
};

const normalizeShippingType = (shippingType) => {
  const type = String(
    shippingType || "LOCAL",
  ).toUpperCase();

  const supportedTypes = [
    "LOCAL",
    "IMPORT",
    "SEA",
    "AIR",
    "DIGITAL",
  ];

  return supportedTypes.includes(type)
    ? type
    : "LOCAL";
};

// ============================================================================
// VOLUMETRIC FACTORS
// ============================================================================

/**
 * Volumetric conversion:
 *
 * SEA     = 1 CBM → 1000 kg
 * AIR     = 1 CBM → 167 kg
 * LOCAL   = 1 CBM → 250 kg
 * IMPORT  = 1 CBM → 167 kg
 * DIGITAL = 0 kg
 */
const VOLUMETRIC_FACTORS = {
  SEA: 1000,
  AIR: 167,
  LOCAL: 250,
  IMPORT: 167,
  DIGITAL: 0,
};

// ============================================================================
// DIMENSIONS
// ============================================================================

/**
 * Product dimensions are stored in centimeters.
 *
 * Converts:
 *
 * cm → meters
 */
const normalizeDimensions = ({
  length,
  width,
  height,
}) => ({
  length: toNumber(length) / 100,
  width: toNumber(width) / 100,
  height: toNumber(height) / 100,
});

/**
 * Calculate CBM.
 *
 * Formula:
 *
 * (length cm / 100)
 * ×
 * (width cm / 100)
 * ×
 * (height cm / 100)
 * × quantity
 */
const calculateCBM = ({
  length,
  width,
  height,
  quantity = 1,
}) => {
  const dims = normalizeDimensions({
    length,
    width,
    height,
  });

  return (
    dims.length *
    dims.width *
    dims.height *
    toNumber(quantity)
  );
};

// ============================================================================
// WEIGHT
// ============================================================================

const calculateVolumetricWeight = (
  cbm,
  shippingType = "LOCAL",
) => {
  const type =
    normalizeShippingType(shippingType);

  const factor =
    VOLUMETRIC_FACTORS[type];

  return toNumber(cbm) * factor;
};

const calculateChargeableWeight = ({
  actualWeight,
  volumetricWeight,
}) => {
  return Math.max(
    toNumber(actualWeight),
    toNumber(volumetricWeight),
  );
};

// ============================================================================
// ITEM
// ============================================================================

const calculateItem = (item = {}) => {
  const quantity = toNumber(
    item.quantity || 1,
  );

  const unitPrice = toNumber(
    item.unitPrice,
  );

  const shippingType =
    normalizeShippingType(
      item.shippingType,
    );

  const cbm = calculateCBM({
    length: item.length,
    width: item.width,
    height: item.height,
    quantity,
  });

  const actualWeight =
    toNumber(item.actualWeight) *
    quantity;

  const volumetricWeight =
    calculateVolumetricWeight(
      cbm,
      shippingType,
    );

  const chargeableWeight =
    calculateChargeableWeight({
      actualWeight,
      volumetricWeight,
    });

  const subtotal =
    unitPrice * quantity;

  return {
    ...item,

    quantity,

    shippingType,

    subtotal: round(
      subtotal,
      2,
    ),

    cbm: round(
      cbm,
      4,
    ),

    actualWeight: round(
      actualWeight,
      2,
    ),

    volumetricWeight: round(
      volumetricWeight,
      2,
    ),

    chargeableWeight: round(
      chargeableWeight,
      2,
    ),
  };
};

// ============================================================================
// ITEMS
// ============================================================================

const calculateItems = (
  items = [],
) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map(
    calculateItem,
  );
};

// ============================================================================
// FULFILLMENT GROUP
// ============================================================================

const calculateFulfillment = (
  groups = {},
) => {
  const result = {};

  for (
    const [type, items]
    of Object.entries(groups)
  ) {
    const calculated =
      calculateItems(items);

    result[type] = {
      items: calculated,

      totalCBM: round(
        calculated.reduce(
          (sum, item) =>
            sum + item.cbm,
          0,
        ),
        4,
      ),

      totalActualWeight: round(
        calculated.reduce(
          (sum, item) =>
            sum +
            item.actualWeight,
          0,
        ),
        2,
      ),

      totalChargeableWeight: round(
        calculated.reduce(
          (sum, item) =>
            sum +
            item.chargeableWeight,
          0,
        ),
        2,
      ),

      subtotal: round(
        calculated.reduce(
          (sum, item) =>
            sum + item.subtotal,
          0,
        ),
        2,
      ),
    };
  }

  return result;
};

// ============================================================================
// ORDER
// ============================================================================

const calculateOrder = (
  items = [],
) => {
  const calculated =
    calculateItems(items);

  const subtotal =
    calculated.reduce(
      (sum, item) =>
        sum + item.subtotal,
      0,
    );

  const totalCBM =
    calculated.reduce(
      (sum, item) =>
        sum + item.cbm,
      0,
    );

  const totalActualWeight =
    calculated.reduce(
      (sum, item) =>
        sum + item.actualWeight,
      0,
    );

  const totalChargeableWeight =
    calculated.reduce(
      (sum, item) =>
        sum +
        item.chargeableWeight,
      0,
    );

  return {
    items: calculated,

    subtotal: round(
      subtotal,
      2,
    ),

    totalCBM: round(
      totalCBM,
      4,
    ),

    totalActualWeight: round(
      totalActualWeight,
      2,
    ),

    totalChargeableWeight: round(
      totalChargeableWeight,
      2,
    ),
  };
};

// ============================================================================
// VALIDATION
// ============================================================================

const validateDimensions = ({
  length,
  width,
  height,
  unit = "cm",
}) => {
  if (
    length == null ||
    width == null ||
    height == null
  ) {
    throw new Error(
      "Length, width, and height are required",
    );
  }

  const numericLength =
    toNumber(length);

  const numericWidth =
    toNumber(width);

  const numericHeight =
    toNumber(height);

  if (
    numericLength <= 0 ||
    numericWidth <= 0 ||
    numericHeight <= 0
  ) {
    throw new Error(
      "Dimensions must be greater than 0",
    );
  }

  if (
    unit !== "cm" &&
    unit !== "m"
  ) {
    throw new Error(
      'Unit must be either "cm" or "m"',
    );
  }

  if (
    unit === "cm" &&
    (
      numericLength > 1000 ||
      numericWidth > 1000 ||
      numericHeight > 1000
    )
  ) {
    throw new Error(
      "Dimensions cannot exceed 1000cm",
    );
  }

  return true;
};

// ============================================================================
// EXPORT
// ============================================================================

export const ShippingCalculator = {
  calculateItem,
  calculateItems,
  calculateFulfillment,
  calculateOrder,
  validateDimensions,
};
