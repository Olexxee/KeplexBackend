// modules/checkout/checkout.service.js
import { prisma } from "../../config/prisma.js";
import { BadRequestError } from "../../classes/errorClasses.js";
import { ShippingCalculator } from "../shipping/shipping.calculator.js";
import * as shippingService from "../shipping/shipping.service.js";
import * as orderDb from "../orders/order.db.js";
import * as cartDb from "../cart/cart.db.js";
import * as addressDb from "../addresses/address.db.js";
import { OrderSplitter } from "../fulfillment/order.splitter.js";

const toNumber = (v) => Number(v);

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

    if (!variant.isActive) {
      errors.push({
        variantId: cartItem.variantId,
        sku: variant.sku,
        productName: variant.product?.name || "Unknown",
        error: "Variant is no longer available",
      });
    }

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

const calculateTotal = (cart) => {
  return cart.items.reduce(
    (sum, item) => sum + toNumber(item.unitPriceSnapshot) * item.quantity,
    0,
  );
};

const buildShippingItems = (cart) => {
  return cart.items.map((cartItem) => {
    const variant = cartItem.variant;
    return {
      variantId: cartItem.variantId,
      name: variant?.product?.name || "Unknown",
      quantity: cartItem.quantity,
      unitPrice: cartItem.unitPriceSnapshot,
      length: variant?.length ? Number(variant.length) : null,
      width: variant?.width ? Number(variant.width) : null,
      height: variant?.height ? Number(variant.height) : null,
      actualWeight: variant?.actualWeight ? Number(variant.actualWeight) : 0,
      shippingType: variant?.shippingType || "LOCAL",
      fulfillmentType: variant?.fulfillmentType || "LOCAL",
    };
  });
};

export const checkout = async ({ userId, payload }) => {
  const { addressId, notes } = payload;

  return prisma.$transaction(async (tx) => {
    // 1. Get active cart with variants
    const cart = await cartDb.findActiveCartForCheckout(userId, tx);
    validateCart(cart);

    // 2. Get delivery address
    let address;
    if (addressId) {
      address = await addressDb.findAddressById(addressId);
      if (!address || address.userId !== userId) {
        throw new BadRequestError("Invalid delivery address");
      }
    } else {
      const addresses = await addressDb.getAddressesByUser(userId);
      address = addresses.find((addr) => addr.isDefault);
      if (!address) {
        throw new BadRequestError("Please add a delivery address");
      }
    }

    // 3. Get user email
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // 4. Build shipping items and calculate logistics metrics
    const shippingItems = buildShippingItems(cart);
    const metrics = ShippingCalculator.calculateOrder(shippingItems);

    // 5. Calculate shipping quote with pricing
    const shippingQuote = await shippingService.calculateShippingQuote(
      shippingItems,
      { city: address.city, state: address.state, country: address.country },
      { userId },
    );

    // 6. Split order by fulfillment type
    const splitter = new OrderSplitter();
    const fulfillmentGroups = splitter.splitOrderByFulfillment(cart.items);

    // 7. Calculate totals
    const subtotal = calculateTotal(cart);
    const shippingCost = shippingQuote.shippingCost || 0;
    const taxAmount = 0;
    const totalAmount = subtotal + shippingCost + taxAmount;

    // 8. Decrement stock
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

    // 9. Create order with metrics
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
          totalCBM: metrics.totalCBM,
          totalChargeableWeight: metrics.totalChargeableWeight,
          items: metrics.items.map((item) => ({
            variantId: item.variantId,
            sku: item.sku,
            productName: item.name,
            quantity: item.quantity,
            cbm: item.cbm,
            chargeableWeight: item.chargeableWeight,
            dimensions: {
              length: item.length,
              width: item.width,
              height: item.height,
            },
          })),
        },
        itemsWithCBM: metrics.items,
      },
      tx,
    );

    // 10. Mark cart as checked out
    await cartDb.markCartAsCheckedOut(cart.id, tx);

    // 11. Create fulfillments
    await createFulfillmentsForOrder(order.id, fulfillmentGroups, tx);

    // 12. Create audit log
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
          shippingCost,
          totalCBM: metrics.totalCBM,
        },
      },
      tx,
    );

    return {
      ...order,
      shippingQuote,
      fulfillmentGroups,
    };
  });
};

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
