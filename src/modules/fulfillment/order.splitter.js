import * as warehouseDb from "./fulfillment.db.js";

export class OrderSplitter {
  /**
   * Split order items by fulfillment type
   */
  splitOrderByFulfillment(items) {
    const groups = {
      LOCAL: [],
      IMPORT: [],
      PREORDER: [],
      DIGITAL: [],
    };

    for (const item of items) {
      const fulfillmentType = item.variant?.fulfillmentType || "LOCAL";
      groups[fulfillmentType].push({
        ...item,
        fulfillmentType,
      });
    }

    // Filter out empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([_, items]) => items.length > 0),
    );
  }

  /**
   * Assign warehouse based on fulfillment type and items
   */
  async assignWarehouse(type, items) {
    let warehouse = null;

    switch (type) {
      case "LOCAL":
        warehouse = await this.findLocalWarehouse(items);
        break;
      case "IMPORT":
        warehouse = await this.findImportWarehouse();
        break;
      case "PREORDER":
        warehouse = await this.findPreorderWarehouse();
        break;
      case "DIGITAL":
        return null;
      default:
        warehouse = await this.findDefaultWarehouse();
    }

    return warehouse?.id || null;
  }

  /**
   * Find best local warehouse based on items and location
   */
  async findLocalWarehouse(items) {
    // Get all active warehouses
    const [warehouses] = await warehouseDb.findWarehouses({
      isActive: true,
      take: 100,
    });

    if (warehouses.length === 0) {
      return null;
    }

    // Simple strategy: pick warehouse with most stock for these items
    // In production, you'd use more sophisticated logic (proximity, capacity, etc.)
    const warehouseScores = {};

    for (const warehouse of warehouses) {
      let score = 0;
      // Check if warehouse has capacity for items
      // This would ideally check current stock levels
      // For now, just score based on availability
      score += 10; // Base score
      warehouses.forEach((w) => {
        if (w.id === warehouse.id) {
          // Prefer warehouses with more capacity
          score += Math.random() * 5;
        }
      });
      warehouseScores[warehouse.id] = score;
    }

    // Sort by score and pick best
    const sorted = Object.entries(warehouseScores).sort((a, b) => b[1] - a[1]);
    const bestWarehouseId = sorted[0]?.[0];

    return warehouses.find((w) => w.id === bestWarehouseId) || warehouses[0];
  }

  /**
   * Find import warehouse
   */
  async findImportWarehouse() {
    const [warehouses] = await warehouseDb.findWarehouses({
      isActive: true,
      take: 100,
    });

    // Find warehouse designated for imports
    // You could add a 'type' field to Warehouse model
    // For now, just pick first active warehouse
    return warehouses[0] || null;
  }

  /**
   * Find preorder warehouse
   */
  async findPreorderWarehouse() {
    const [warehouses] = await warehouseDb.findWarehouses({
      isActive: true,
      take: 100,
    });

    // Preorders might go to a specific warehouse
    // For now, just pick first active warehouse
    return warehouses[0] || null;
  }

  /**
   * Find default warehouse
   */
  async findDefaultWarehouse() {
    const [warehouses] = await warehouseDb.findWarehouses({
      isActive: true,
      take: 1,
    });

    return warehouses[0] || null;
  }

  /**
   * Generate fulfillment summary
   */
  generateFulfillmentSummary(fulfillmentGroups) {
    const summary = [];

    for (const [type, items] of Object.entries(fulfillmentGroups)) {
      if (items.length === 0) continue;

      summary.push({
        type,
        itemCount: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: items.reduce(
          (sum, item) => sum + Number(item.unitPriceSnapshot) * item.quantity,
          0,
        ),
        items: items.map((item) => ({
          variantId: item.variantId,
          sku: item.variant?.sku,
          productName: item.variant?.product?.name,
          quantity: item.quantity,
          price: Number(item.unitPriceSnapshot),
        })),
      });
    }

    return summary;
  }

  /**
   * Calculate shipping for each fulfillment group
   */
  async calculateGroupShipping(fulfillmentGroups, shippingConfig) {
    const results = {};

    for (const [type, items] of Object.entries(fulfillmentGroups)) {
      if (items.length === 0) continue;

      const totalWeight = items.reduce(
        (sum, item) => sum + Number(item.variant?.weight || 0) * item.quantity,
        0,
      );

      const totalCBM = items.reduce((sum, item) => {
        const variant = item.variant;
        if (variant?.length && variant?.width && variant?.height) {
          const lengthM = Number(variant.length) / 100;
          const widthM = Number(variant.width) / 100;
          const heightM = Number(variant.height) / 100;
          return sum + lengthM * widthM * heightM * item.quantity;
        }
        return sum;
      }, 0);

      // Calculate cost based on fulfillment type
      let cost = 0;
      if (type === "LOCAL") {
        cost = totalWeight * (shippingConfig?.pricePerKg || 0);
      } else if (type === "IMPORT") {
        cost = totalWeight * (shippingConfig?.pricePerKg || 0) * 1.5; // Import premium
      } else if (type === "PREORDER") {
        cost = 0; // Preorders might have free shipping
      } else if (type === "DIGITAL") {
        cost = 0; // Digital items have no shipping
      }

      results[type] = {
        type,
        totalWeight: parseFloat(totalWeight.toFixed(2)),
        totalCBM: parseFloat(totalCBM.toFixed(4)),
        cost: parseFloat(cost.toFixed(2)),
        itemCount: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      };
    }

    return results;
  }
}
