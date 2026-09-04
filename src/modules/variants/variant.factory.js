// modules/variants/variant.factory.js

import { SKUGenerator } from "./sku.generator.js";

// ============================================================================
// VARIANT FACTORY
// ============================================================================

export class VariantFactory {
  /**
   * Build a new variant.
   *
   * Responsibilities:
   * - Copy incoming variant data
   * - Generate SKU when one is not provided
   *
   * Shipping calculations such as CBM and chargeable weight are intentionally
   * not persisted on ProductVariant. They can be calculated from:
   *
   *   length
   *   width
   *   height
   *   actualWeight
   *   shippingType
   */
  static async buildForCreate(payload, context = {}) {
    const { productName, categoryId } = context;

    const variant = {
      ...payload,
    };

    if (!variant.sku) {
      variant.sku = await SKUGenerator.generateSKU({
        productName,
        categoryId,
        color: variant.color,
        size: variant.size,
      });
    }

    return variant;
  }

  /**
   * Build an existing variant for update.
   *
   * Only scalar fields are merged in. `existingVariant` comes from
   * findVariantById(), which uses `variantInclude` and therefore carries
   * relation data (product, media, cartItems, orderItems, wishlists,
   * reviews). Relations must NEVER be spread into a Prisma `data`
   * payload — Prisma expects relation-specific write syntax
   * (create/set/connect), not raw included objects/arrays, and will
   * throw a validation error otherwise.
   */
  static async buildForUpdate(existingVariant, payload, context = {}) {
    const {
      id,
      product,
      media,
      cartItems,
      orderItems,
      wishlists,
      reviews,
      createdAt,
      updatedAt,
      ...scalarFields
    } = existingVariant;

    return {
      ...scalarFields,
      ...payload,
    };
  }

  /**
   * Build multiple variants.
   */
  static async buildMany(variants = [], context = {}) {
    return Promise.all(
      variants.map((variant) => this.buildForCreate(variant, context)),
    );
  }
}
