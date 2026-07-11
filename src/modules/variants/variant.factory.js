// modules/variants/variant.factory.js
import { SKUGenerator } from "./sku.generator.js";
import { CBMCalculator } from "../shipping/cbm.calculator.js";

export class VariantFactory {
  static async buildForCreate(payload, context = {}) {
    const { productName, categoryId, defaultShippingType = "SEA" } = context;

    const variant = { ...payload };

    // Generate SKU
    if (!variant.sku) {
      variant.sku = await SKUGenerator.generateSKU({
        productName,
        categoryId,
        color: variant.color,
        size: variant.size,
      });
    }

    this.#calculateShippingFields(variant, defaultShippingType);

    return variant;
  }

  static async buildForUpdate(existingVariant, payload, context = {}) {
    const { defaultShippingType = "SEA" } = context;

    const variant = {
      ...existingVariant,
      ...payload,
    };

    this.#calculateShippingFields(variant, defaultShippingType);

    return variant;
  }

  static async buildMany(variants = [], context = {}) {
    return Promise.all(
      variants.map((variant) => this.buildForCreate(variant, context)),
    );
  }

  static #calculateShippingFields(variant, defaultShippingType) {
    if (variant.length && variant.width && variant.height) {
      variant.cbm = CBMCalculator.calculateCBM({
        length: variant.length,
        width: variant.width,
        height: variant.height,
      });
    }

    if (variant.cbm && variant.actualWeight) {
      const shippingType = variant.shippingType || defaultShippingType;

      variant.volumetricWeight = CBMCalculator.calculateVolumetricWeight(
        variant.cbm,
        shippingType,
      );

      variant.chargeableWeight = CBMCalculator.calculateChargeableWeight(
        variant.actualWeight,
        variant.cbm,
        shippingType,
      );
    }
  }
}
