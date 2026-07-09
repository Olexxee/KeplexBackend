// modules/variants/sku.generator.js
import { prisma } from "../../config/prisma.js";

export class SKUGenerator {
  /**
   * Generate SKU with pattern: {prefix}-{categoryCode}-{color}-{size}-{random}
   */
  static async generateSKU(params) {
    const {
      productName,
      categoryId,
      color,
      size,
      prefix = "KEP",
      randomLength = 4,
    } = params;

    // Get category code
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    });

    const categoryCode = category?.name?.substring(0, 3).toUpperCase() || "GEN";
    const colorCode = color?.substring(0, 2).toUpperCase() || "XX";
    const sizeCode = size?.substring(0, 2).toUpperCase() || "XX";
    const random = Math.random()
      .toString(36)
      .substring(2, 2 + randomLength)
      .toUpperCase();

    let sku = `${prefix}-${categoryCode}-${colorCode}-${sizeCode}-${random}`;

    // Ensure uniqueness
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      const existing = await prisma.productVariant.findUnique({
        where: { sku },
      });

      if (!existing) {
        isUnique = true;
      } else {
        // Regenerate random part
        const newRandom = Math.random()
          .toString(36)
          .substring(2, 2 + randomLength)
          .toUpperCase();
        sku = `${prefix}-${categoryCode}-${colorCode}-${sizeCode}-${newRandom}`;
        attempts++;
      }
    }

    return sku;
  }

  /**
   * Generate bulk SKUs for multiple variants
   */
  static async generateBulkSKUs(variants) {
    const skus = [];

    for (const variant of variants) {
      const sku = await this.generateSKU(variant);
      skus.push(sku);
    }

    return skus;
  }
}
