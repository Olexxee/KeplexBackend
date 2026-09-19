import { SKUGenerator } from "./sku.generator.js";

export class VariantFactory {
  /**
   * Build a new variant.
   *
   * @param {object} payload
   * @param {object} [context]
   * @param {string} [context.productName]
   * @param {string} [context.categoryId]
   * @param {object} [context.tx]   Prisma tx client, forwarded to the
   *   SKU generator so uniqueness checks run inside the current tx.
   */
  static async buildForCreate(payload, context = {}) {
    const { productName, categoryId, tx = null } = context;

    const variant = { ...payload };

    if (!variant.sku) {
      variant.sku = await SKUGenerator.generateSKU(
        {
          productName,
          categoryId,
          color: variant.color,
          size: variant.size,
        },
        tx,
      );
    }

    return variant;
  }

  /**
   * Merge scalar fields into an existing variant.
   *
   * `existingVariant` comes from findVariantById(), so it carries
   * relation data (product, media, ...). Relations must NEVER be spread
   * into a Prisma `data` payload — Prisma expects relation-specific
   * write syntax (create/set/connect).
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

  static async buildMany(variants = [], context = {}) {
    return Promise.all(
      variants.map((variant) => this.buildForCreate(variant, context)),
    );
  }
}
