import * as warehouseDb from "../warehouse/warehouse.db.js";

const FULFILLMENT_TYPES = {
  LOCAL: "LOCAL",
  IMPORT: "IMPORT",
  PREORDER: "PREORDER",
  DIGITAL: "DIGITAL",
};

export class OrderSplitter {
  splitOrderByFulfillment(items = []) {
    const groups = {
      LOCAL: [],
      IMPORT: [],
      PREORDER: [],
      DIGITAL: [],
    };

    for (const item of items) {
      const fulfillmentType =
        item.variant?.fulfillmentType ||
        item.fulfillmentType ||
        FULFILLMENT_TYPES.LOCAL;

      if (!groups[fulfillmentType]) {
        throw new Error(`Unsupported fulfillment type: ${fulfillmentType}`);
      }

      groups[fulfillmentType].push(item);
    }

    return Object.fromEntries(
      Object.entries(groups).filter(([, groupItems]) => groupItems.length > 0),
    );
  }

  async assignWarehouse(type, tx) {
    if (type === FULFILLMENT_TYPES.DIGITAL) {
      return null;
    }

    const warehouse = await warehouseDb.findActiveWarehouseByType(type, tx);

    if (!warehouse) {
      throw new Error(
        `No active warehouse configured for fulfillment type: ${type}`,
      );
    }

    return warehouse;
  }

  generateFulfillmentSummary(groups = {}) {
    return Object.entries(groups).map(([type, items]) => ({
      type,

      itemCount: items.length,

      quantity: items.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0,
      ),
    }));
  }
}

export const orderSplitter = new OrderSplitter();

export { FULFILLMENT_TYPES };
