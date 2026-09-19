// modules/variants/sku.generator.js
import { prisma } from "../../config/prisma.js";

export class SKUGenerator {
  /**
   * Generate SKU with pattern:
   *   {prefix}-{categoryCode}-{color}-{size}-{random}
   *
   * @param {object} params
   * @param {object} [tx]  Prisma client or transaction client. When a
   *   transaction is active, this MUST be passed so the uniqueness
   *   check sees uncommitted rows from the current tx. Without it,
   *   two new variants in the same payload can race to the same SKU
   *   and only the DB unique constraint will catch it (as a raw 500).
   */
  static async generateSKU(params, tx = null) {
    const client = tx ?? prisma;

    const {
      productName,
      categoryId,
      color,
      size,
      prefix = "KEP",
      randomLength = 4,
    } = params;

    const category = await client.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    });

    const categoryCode = category?.name?.substring(0, 3).toUpperCase() || "GEN";
    const colorCode = color?.substring(0, 2).toUpperCase() || "XX";
    const sizeCode = size?.substring(0, 2).toUpperCase() || "XX";

    const makeRandom = () =>
      Math.random()
        .toString(36)
        .substring(2, 2 + randomLength)
        .toUpperCase();

    let sku = `${prefix}-${categoryCode}-${colorCode}-${sizeCode}-${makeRandom()}`;

    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      const existing = await client.productVariant.findUnique({
        where: { sku },
        select: { id: true },
      });

      if (!existing) {
        isUnique = true;
      } else {
        sku = `${prefix}-${categoryCode}-${colorCode}-${sizeCode}-${makeRandom()}`;
        attempts++;
      }
    }

    return sku;
  }

  static async generateBulkSKUs(variants, tx = null) {
    const skus = [];
    for (const variant of variants) {
      skus.push(await this.generateSKU(variant, tx));
    }
    return skus;
  }
}
