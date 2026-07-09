// modules/shipping/cbm.calculator.js

export class CBMCalculator {
  /**
   * Calculate CBM (Cubic Meter)
   * Formula: (Length × Width × Height) / 1,000,000 (if in cm)
   * Or: Length × Width × Height (if in meters)
   */
  static calculateCBM(dimensions) {
    const { length, width, height, unit = "cm" } = dimensions;

    // Convert to meters if in cm
    const lengthM = unit === "cm" ? length / 100 : length;
    const widthM = unit === "cm" ? width / 100 : width;
    const heightM = unit === "cm" ? height / 100 : height;

    const cbm = lengthM * widthM * heightM;

    return parseFloat(cbm.toFixed(4));
  }

  /**
   * Calculate volumetric weight (chargeable weight)
   * SEA: 1 CBM = 1000 kg
   * AIR: 1 CBM = 166.667 kg
   * ROAD: 1 CBM = 333.333 kg
   */
  static calculateVolumetricWeight(cbm, type = "SEA") {
    const CONVERSION_RATES = {
      LOCAL: 1000,
      IMPORT: 166.667,
      SEA: 1000,
      AIR: 166.667,
      ROAD: 333.333,
    };

    const rate = CONVERSION_RATES[type] || CONVERSION_RATES.SEA;
    const volumetricWeight = cbm * rate;

    return parseFloat(volumetricWeight.toFixed(2));
  }

  /**
   * Determine chargeable weight (actual vs volumetric)
   */
  static calculateChargeableWeight(actualWeight, cbm, type = "SEA") {
    const volumetricWeight = this.calculateVolumetricWeight(cbm, type);
    const chargeableWeight = Math.max(actualWeight, volumetricWeight);

    return parseFloat(chargeableWeight.toFixed(2));
  }

  /**
   * Calculate shipping cost based on CBM (Sea Freight)
   */
  static calculateSeaFreightCost(params) {
    const {
      length,
      width,
      height,
      actualWeight,
      ratePerCBM,
      handlingFee = 0,
      minCharge = 0,
      unit = "cm",
    } = params;

    const cbm = this.calculateCBM({ length, width, height, unit });
    const chargeableWeight = this.calculateChargeableWeight(
      actualWeight,
      cbm,
      "SEA",
    );

    const cbmCost = cbm * ratePerCBM;
    const totalCost = cbmCost + handlingFee;
    const finalCost = Math.max(totalCost, minCharge);

    return {
      cbm,
      chargeableWeight,
      cost: parseFloat(finalCost.toFixed(2)),
      breakdown: {
        cbmCost: parseFloat(cbmCost.toFixed(2)),
        handlingFee: parseFloat(handlingFee.toFixed(2)),
        minChargeApplied: finalCost > totalCost,
        ratePerCBM,
        minCharge,
        calculation: `${cbm} m³ × ₦${ratePerCBM} = ₦${cbmCost.toFixed(2)}`,
      },
    };
  }

  /**
   * Calculate shipping cost based on weight (Air Freight)
   */
  static calculateAirFreightCost(params) {
    const {
      actualWeight,
      length,
      width,
      height,
      ratePerKg,
      handlingFee = 0,
      minCharge = 0,
      unit = "cm",
    } = params;

    const cbm =
      length && width && height
        ? this.calculateCBM({ length, width, height, unit })
        : 0;

    const volumetricWeight =
      cbm > 0 ? this.calculateVolumetricWeight(cbm, "AIR") : 0;

    const chargeableWeight = Math.max(actualWeight, volumetricWeight);
    const weightCost = chargeableWeight * ratePerKg;
    const totalCost = weightCost + handlingFee;
    const finalCost = Math.max(totalCost, minCharge);

    return {
      cbm,
      chargeableWeight,
      cost: parseFloat(finalCost.toFixed(2)),
      breakdown: {
        weightCost: parseFloat(weightCost.toFixed(2)),
        handlingFee: parseFloat(handlingFee.toFixed(2)),
        minChargeApplied: finalCost > totalCost,
        ratePerKg,
        minCharge,
        calculation: `${chargeableWeight} kg × ₦${ratePerKg} = ₦${weightCost.toFixed(2)}`,
      },
    };
  }

  /**
   * Calculate shipping cost for LOCAL shipping (weight-based)
   */
  static calculateLocalShipping(params) {
    const {
      totalWeight,
      ratePerKg,
      handlingFee = 0,
      minCharge = 0,
      freeShippingThreshold = null,
    } = params;

    // Check free shipping
    if (freeShippingThreshold && totalWeight >= freeShippingThreshold) {
      return {
        cost: 0,
        breakdown: {
          isFreeShipping: true,
          threshold: freeShippingThreshold,
          totalWeight,
        },
      };
    }

    const weightCost = totalWeight * ratePerKg;
    const totalCost = weightCost + handlingFee;
    const finalCost = Math.max(totalCost, minCharge);

    return {
      cost: parseFloat(finalCost.toFixed(2)),
      breakdown: {
        weightCost: parseFloat(weightCost.toFixed(2)),
        handlingFee: parseFloat(handlingFee.toFixed(2)),
        minChargeApplied: finalCost > totalCost,
        ratePerKg,
        minCharge,
        totalWeight,
        calculation: `${totalWeight} kg × ₦${ratePerKg} = ₦${weightCost.toFixed(2)}`,
      },
    };
  }

  /**
   * Batch calculate shipping costs for multiple items
   */
  static calculateOrderShipping(items, shippingConfig) {
    let totalCBM = 0;
    let totalActualWeight = 0;
    let totalChargeableWeight = 0;
    const itemBreakdown = [];
    let totalShippingCost = 0;

    // Group items by shipping type
    const groups = {
      LOCAL: [],
      IMPORT: [],
      SEA: [],
      AIR: [],
      DIGITAL: [],
    };

    for (const item of items) {
      const type = item.shippingType || "LOCAL";
      groups[type].push(item);
    }

    // Calculate each group
    for (const [type, groupItems] of Object.entries(groups)) {
      if (groupItems.length === 0) continue;

      let groupCBM = 0;
      let groupWeight = 0;
      const groupBreakdown = [];

      for (const item of groupItems) {
        // Calculate CBM for each item
        let itemCBM = 0;
        if (item.length && item.width && item.height) {
          itemCBM = this.calculateCBM({
            length: item.length,
            width: item.width,
            height: item.height,
          });
        }

        const itemVolumetricWeight =
          itemCBM > 0 ? this.calculateVolumetricWeight(itemCBM, type) : 0;

        const itemChargeableWeight = Math.max(
          item.actualWeight || 0,
          itemVolumetricWeight,
        );

        groupCBM += itemCBM * item.quantity;
        groupWeight += itemChargeableWeight * item.quantity;

        groupBreakdown.push({
          variantId: item.variantId,
          name: item.name,
          quantity: item.quantity,
          cbm: itemCBM * item.quantity,
          chargeableWeight: itemChargeableWeight * item.quantity,
          unitPrice: item.price,
        });
      }

      totalCBM += groupCBM;
      totalActualWeight += groupWeight;

      // Calculate cost for this group
      let groupCost = 0;
      let costBreakdown = {};

      if (type === "SEA") {
        const result = this.calculateSeaFreightCost({
          cbm: groupCBM,
          actualWeight: groupWeight,
          ratePerCBM: shippingConfig.pricePerCBM || 0,
          handlingFee: shippingConfig.cbmHandlingFee || 0,
          minCharge: shippingConfig.cbmMinCharge || 0,
        });
        groupCost = result.cost;
        costBreakdown = result.breakdown;
      } else if (type === "AIR") {
        const result = this.calculateAirFreightCost({
          actualWeight: groupWeight,
          cbm: groupCBM,
          ratePerKg: shippingConfig.pricePerKg || 0,
          handlingFee: shippingConfig.handlingFee || 0,
          minCharge: shippingConfig.minCharge || 0,
        });
        groupCost = result.cost;
        costBreakdown = result.breakdown;
      } else {
        // LOCAL or IMPORT
        const result = this.calculateLocalShipping({
          totalWeight: groupWeight,
          ratePerKg: shippingConfig.pricePerKg || 0,
          handlingFee: shippingConfig.handlingFee || 0,
          minCharge: shippingConfig.minCharge || 0,
          freeShippingThreshold: shippingConfig.freeShippingThreshold || null,
        });
        groupCost = result.cost;
        costBreakdown = result.breakdown;
      }

      totalShippingCost += groupCost;

      itemBreakdown.push({
        type,
        cbm: groupCBM,
        weight: groupWeight,
        cost: groupCost,
        items: groupBreakdown,
        breakdown: costBreakdown,
      });
    }

    return {
      totalCBM: parseFloat(totalCBM.toFixed(4)),
      totalActualWeight: parseFloat(totalActualWeight.toFixed(2)),
      totalShippingCost: parseFloat(totalShippingCost.toFixed(2)),
      itemBreakdown,
      groups: groups,
    };
  }

  /**
   * Validate CBM dimensions
   */
  static validateDimensions(dimensions) {
    const { length, width, height, unit = "cm" } = dimensions;

    if (!length || !width || !height) {
      throw new Error("Length, width, and height are required");
    }

    if (length <= 0 || width <= 0 || height <= 0) {
      throw new Error("Dimensions must be greater than 0");
    }

    if (unit !== "cm" && unit !== "m") {
      throw new Error('Unit must be either "cm" or "m"');
    }

    const maxDimension = 1000; // 10 meters in cm
    if (
      unit === "cm" &&
      (length > maxDimension || width > maxDimension || height > maxDimension)
    ) {
      throw new Error(`Dimensions cannot exceed ${maxDimension}cm`);
    }

    return true;
  }
}
