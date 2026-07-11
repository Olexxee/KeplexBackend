// modules/checkout/checkout.service.js
import { prisma } from "../../config/prisma.js";
import { BadRequestError } from "../../classes/errorClasses.js";
import * as orderDb from "../orders/order.db.js";
import * as cartDb from "../cart/cart.db.js";
import * as addressDb from "../addresses/address.db.js";
import { CBMCalculator } from "../shipping/cbm.calculator.js";
import * as shippingService from "../shipping/shipping.service.js";
import { OrderSplitter } from "../fulfillment/order.splitter.js";

const toNumber = (v) => Number(v);

/**
 * Validate cart with variants
 */
const validateCart = (cart) => {
  if (!cart) {
    throw new BadRequestError("Active cart not found");
  }

  if (!cart.items || cart.items.length === 0) {
    throw new BadRequestError("Cannot checkout an empty cart");
  }

  const errors = [];

  for (const cartItem of cart.items) {
    const variant = cartItem.variant;

    if (!variant) {
      errors.push({
        variantId: cartItem.variantId,
        error: "Variant not found",
      });
      continue;
    }

    // Check if variant is active
    if (!variant.isActive) {
      errors.push({
        variantId: cartItem.variantId,
        sku: variant.sku,
        productName: variant.product?.name || "Unknown",
        error: "Variant is no longer available",
      });
    }

    // Check stock
    if (variant.stock < cartItem.quantity) {
      errors.push({
        variantId: cartItem.variantId,
        sku: variant.sku,
        productName: variant.product?.name || "Unknown",
        available: variant.stock,
        requested: cartItem.quantity,
        error: "Insufficient stock",
      });
    }

    // Check if variant has price
    if (!variant.price || Number(variant.price) <= 0) {
      errors.push({
        variantId: cartItem.variantId,
        sku: variant.sku,
        error: "Variant has invalid price",
      });
    }
  }

  if (errors.length > 0) {
    throw new BadRequestError("Cart validation failed", { errors });
  }

  return true;
};

/**
 * Calculate total from cart items
 */
const calculateTotal = (cart) => {
  return cart.items.reduce(
    (sum, item) => sum + toNumber(item.unitPriceSnapshot) * item.quantity,
    0,
  );
};

/**
 * Calculate CBM for cart items
 */
const calculateCartCBM = (cart) => {
  if (!cart || !cart.items) return [];

  return cart.items.map((cartItem) => {
    const variant = cartItem.variant;
    let itemCBM = 0;
    let chargeableWeight = 0;

    if (variant?.length && variant?.width && variant?.height) {
      // Calculate CBM (convert cm to m)
      const lengthM = Number(variant.length) / 100;
      const widthM = Number(variant.width) / 100;
      const heightM = Number(variant.height) / 100;
      itemCBM = lengthM * widthM * heightM * cartItem.quantity;

      // Calculate chargeable weight
      const actualWeight =
        Number(variant.actualWeight || 0) * cartItem.quantity;
      const volumetricWeight = itemCBM * 1000; // 1 CBM = 1000 kg for sea freight
      chargeableWeight = Math.max(actualWeight, volumetricWeight);
    }

    return {
      ...cartItem,
      cbm: parseFloat(itemCBM.toFixed(4)),
      chargeableWeight: parseFloat(chargeableWeight.toFixed(2)),
    };
  });
};

/**
 * Calculate shipping cost for cart
 */
const calculateShipping = async (cart, itemsWithCBM) => {
  const shippingItems = itemsWithCBM.map((item) => {
    const variant = item.variant;
    return {
      variantId: item.variantId,
      name: variant?.product?.name || "Unknown",
      quantity: item.quantity,
      price: Number(item.unitPriceSnapshot),
      length: variant?.length ? Number(variant.length) : null,
      width: variant?.width ? Number(variant.width) : null,
      height: variant?.height ? Number(variant.height) : null,
      actualWeight: variant?.actualWeight ? Number(variant.actualWeight) : 0,
      shippingType: variant?.shippingType || "LOCAL",
      fulfillmentType: variant?.fulfillmentType || "LOCAL",
      cbm: item.cbm,
      chargeableWeight: item.chargeableWeight,
    };
  });

  // Get active shipping configuration
  const config = await shippingService.getActiveShippingConfig();
  if (!config) {
    // If no shipping config, return zero shipping (will be handled by admin)
    return {
      totalCost: 0,
      totalCBM: 0,
      totalWeight: 0,
      itemBreakdown: [],
      groups: {},
    };
  }

  // Calculate shipping using CBM calculator
  const shippingCosts = CBMCalculator.calculateOrderShipping(
    shippingItems,
    config,
  );

  return shippingCosts;
};

/**
 * Main checkout function
 */
export const checkout = async ({ userId, payload }) => {
  const { addressId, notes } = payload;

  return prisma.$transaction(async (tx) => {
    // 1. Get active cart with variants
    const cart = await cartDb.findActiveCartForCheckout(userId, tx);

    // 2. Validate cart
    validateCart(cart);

    // 3. Get or validate delivery address
    let address;
    if (addressId) {
      address = await addressDb.findAddressById(addressId);
      if (!address || address.userId !== userId) {
        throw new BadRequestError("Invalid delivery address");
      }
    } else {
      // Get default address
      const addresses = await addressDb.getAddressesByUser(userId);
      address = addresses.find((addr) => addr.isDefault);
      if (!address) {
        throw new BadRequestError("Please add a delivery address");
      }
    }

    // 4. Get user email
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // 5. Calculate CBM for all items
    const itemsWithCBM = calculateCartCBM(cart);

    // 6. Calculate shipping cost
    const shippingCalculation = await calculateShipping(cart, itemsWithCBM);

    // 7. Split order by fulfillment type
    const splitter = new OrderSplitter();
    const fulfillmentGroups = splitter.splitOrderByFulfillment(cart.items);

    // 8. Calculate totals
    const subtotal = calculateTotal(cart);
    const shippingCost = shippingCalculation.totalCost || 0;
    const taxAmount = 0; // Will be implemented later
    const totalAmount = subtotal + shippingCost + taxAmount;

    // 9. Decrement stock for all items
    for (const cartItem of cart.items) {
      const result = await orderDb.decrementVariantStock(
        {
          variantId: cartItem.variantId,
          quantity: cartItem.quantity,
        },
        tx,
      );

      if (result.count === 0) {
        const variant = cartItem.variant;
        throw new BadRequestError(
          `${variant?.product?.name || "Product"} (${variant?.sku}) has insufficient stock`,
        );
      }
    }

    // 10. Create order
    const order = await orderDb.createOrderFromCart(
      {
        userId,
        payload: { notes, fulfillmentGroups },
        address,
        cart,
        totalAmount,
        shippingCost,
        taxAmount,
        cbmData: {
          totalCBM: itemsWithCBM.reduce((sum, item) => sum + item.cbm, 0),
          totalChargeableWeight: itemsWithCBM.reduce(
            (sum, item) => sum + item.chargeableWeight,
            0,
          ),
          items: itemsWithCBM.map((item) => ({
            variantId: item.variantId,
            sku: item.variant?.sku,
            productName: item.variant?.product?.name,
            quantity: item.quantity,
            cbm: item.cbm,
            chargeableWeight: item.chargeableWeight,
            dimensions: {
              length: item.variant?.length,
              width: item.variant?.width,
              height: item.variant?.height,
            },
          })),
        },
        itemsWithCBM,
      },
      tx,
    );

    // 11. Mark cart as checked out
    await cartDb.markCartAsCheckedOut(cart.id, tx);

    // 12. Create fulfillments
    await createFulfillmentsForOrder(order.id, fulfillmentGroups, tx);

    // 13. Create audit log
    await orderDb.createAuditLog(
      {
        userId,
        action: "ORDER_CREATED",
        entity: "Order",
        entityId: order.id,
        metadata: {
          orderNumber: order.orderNumber,
          totalAmount,
          itemCount: cart.items.length,
          fulfillmentGroups: Object.keys(fulfillmentGroups),
        },
      },
      tx,
    );

    // 14. Return order with shipping info
    return {
      ...order,
      shippingCalculation,
      fulfillmentGroups,
    };
  });
};

/**
 * Create fulfillments for order
 */
const createFulfillmentsForOrder = async (orderId, fulfillmentGroups, tx) => {
  const splitter = new OrderSplitter();

  for (const [type, items] of Object.entries(fulfillmentGroups)) {
    if (!items || items.length === 0) continue;

    const warehouseId = await splitter.assignWarehouse(type, items);

    await tx.fulfillment.create({
      data: {
        orderId,
        type,
        warehouseId,
        status: "PENDING",
        items: {
          create: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: Number(item.unitPriceSnapshot),
          })),
        },
      },
    });
  }
};
