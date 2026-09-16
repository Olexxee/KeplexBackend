import { prisma } from "../../config/prisma.js";
import { BadRequestError } from "../../classes/errorClasses.js";
import * as shippingService from "../shipping/shipping.service.js";
import * as orderDb from "../order/order.db.js";
import * as cartDb from "../cart/cart.db.js";
import * as addressDb from "../address/address.db.js";
import * as paymentService from "../payment/payment.service.js";
import { orderSplitter } from "../fulfillment/order.splitter.js";

// ============================================================
// CART VALIDATION
// ============================================================

const validateCart = (cart) => {
  const startedAt = Date.now();

  console.log("[CHECKOUT] Validating cart...");

  if (!cart) {
    throw new BadRequestError("Active cart not found");
  }

  if (!cart.items || cart.items.length === 0) {
    throw new BadRequestError(
      "Cannot checkout an empty cart",
    );
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
        productName:
          variant.product?.name || "Unknown",
        error: "Variant is no longer available",
      });
    }

    if (
      Number(variant.stock) <
      Number(cartItem.quantity)
    ) {
      errors.push({
        variantId: cartItem.variantId,
        sku: variant.sku,
        productName:
          variant.product?.name || "Unknown",
        available: variant.stock,
        requested: cartItem.quantity,
        error: "Insufficient stock",
      });
    }

    if (
      cartItem.unitPriceSnapshot == null ||
      Number(cartItem.unitPriceSnapshot) <= 0
    ) {
      errors.push({
        variantId: cartItem.variantId,
        sku: variant.sku,
        error: "Cart item has invalid price",
      });
    }
  }

  if (errors.length > 0) {
    throw new BadRequestError(
      "Cart validation failed",
      {
        errors,
      },
    );
  }

  console.log(
    `[CHECKOUT] Cart validated in ${
      Date.now() - startedAt
    }ms`,
  );

  return true;
};

// ============================================================
// SHIPPING ITEMS
// ============================================================

const buildShippingItems = (cart) => {
  console.log(
    `[CHECKOUT] Building shipping items for ${cart.items.length} cart item(s)...`,
  );

  return cart.items.map((cartItem) => {
    const variant = cartItem.variant;

    return {
      variantId: cartItem.variantId,

      name:
        variant?.product?.name ||
        "Unknown",

      quantity: Number(
        cartItem.quantity,
      ),

      unitPrice: Number(
        cartItem.unitPriceSnapshot,
      ),

      length:
        variant?.length != null
          ? Number(variant.length)
          : null,

      width:
        variant?.width != null
          ? Number(variant.width)
          : null,

      height:
        variant?.height != null
          ? Number(variant.height)
          : null,

      actualWeight:
        variant?.actualWeight != null
          ? Number(
              variant.actualWeight,
            )
          : 0,

      shippingType:
        variant?.shippingType ||
        "LOCAL",

      fulfillmentType:
        variant?.fulfillmentType ||
        "LOCAL",
    };
  });
};

// ============================================================
// DELIVERY ADDRESS
// ============================================================

const resolveDeliveryAddress = async ({
  userId,
  addressId,
}) => {
  const startedAt = Date.now();

  console.log(
    "[CHECKOUT] Resolving delivery address...",
  );

  if (addressId) {
    console.log(
      `[CHECKOUT] Using provided address: ${addressId}`,
    );

    const address =
      await addressDb.findAddressById(
        addressId,
      );

    if (
      !address ||
      address.userId !== userId
    ) {
      throw new BadRequestError(
        "Invalid delivery address",
      );
    }

    console.log(
      `[CHECKOUT] Delivery address resolved in ${
        Date.now() - startedAt
      }ms`,
    );

    return address;
  }

  console.log(
    "[CHECKOUT] No addressId supplied. Looking for default address...",
  );

  const addresses =
    await addressDb.getAddressesByUser(
      userId,
    );

  const defaultAddress =
    addresses.find(
      (address) => address.isDefault,
    );

  if (!defaultAddress) {
    throw new BadRequestError(
      "Please add a delivery address",
    );
  }

  console.log(
    `[CHECKOUT] Default address resolved in ${
      Date.now() - startedAt
    }ms`,
  );

  return defaultAddress;
};

// ============================================================
// PREPARE CHECKOUT
//
// Everything here happens BEFORE the transaction.
//
// IMPORTANT:
// We do NOT resolve warehouses here.
// Fulfillment happens only after successful payment.
// ============================================================

const prepareCheckout = async ({
  userId,
  payload,
}) => {
  const startedAt = Date.now();

  console.log("");
  console.log("========================================");
  console.log("[CHECKOUT] PREPARING CHECKOUT");
  console.log("========================================");

  // ----------------------------------------------------------
  // 1. LOAD CART
  // ----------------------------------------------------------

  const cartStartedAt = Date.now();

  console.log(
    "[CHECKOUT] Loading active cart...",
  );

  const cart =
    await cartDb.findActiveCartByUserId(
      userId,
    );

  console.log(
    `[CHECKOUT] Cart loaded in ${
      Date.now() - cartStartedAt
    }ms`,
  );

  console.log(
    `[CHECKOUT] Cart items: ${
      cart?.items?.length || 0
    }`,
  );

  // ----------------------------------------------------------
  // 2. VALIDATE CART
  // ----------------------------------------------------------

  validateCart(cart);

  // ----------------------------------------------------------
  // 3. RESOLVE ADDRESS
  // ----------------------------------------------------------

  const address =
    await resolveDeliveryAddress({
      userId,
      addressId: payload.addressId,
    });

  console.log(
    "[CHECKOUT] Address:",
    {
      id: address.id,
      city: address.city,
      state: address.state,
      country: address.country,
    },
  );

  // ----------------------------------------------------------
  // 4. BUILD SHIPPING DATA
  // ----------------------------------------------------------

  const shippingItems =
    buildShippingItems(cart);

  // ----------------------------------------------------------
  // 5. CALCULATE SHIPPING
  // ----------------------------------------------------------

  const shippingStartedAt =
    Date.now();

  console.log(
    "[CHECKOUT] Calculating shipping...",
  );

  const shippingQuote =
    await shippingService.calculateShippingQuote(
      {
        items: shippingItems,

        destination: {
          city: address.city,
          state: address.state,
          country: address.country,
        },
      },
    );

  console.log(
    `[CHECKOUT] Shipping calculated in ${
      Date.now() - shippingStartedAt
    }ms`,
  );

  console.log(
    "[CHECKOUT] Shipping quote:",
    {
      subtotal:
        shippingQuote.subtotal,

      shippingCost:
        shippingQuote.shippingCost,

      totalCBM:
        shippingQuote.totalCBM,
    },
  );

  // ----------------------------------------------------------
  // 6. SPLIT FULFILLMENT GROUPS
  //
  // We only persist the grouping on the order.
  //
  // We DO NOT resolve warehouses yet.
  // We DO NOT create fulfillments yet.
  //
  // The payment-confirmed worker will reconstruct the
  // fulfillment plan after payment succeeds.
  // ----------------------------------------------------------

  const fulfillmentStartedAt =
    Date.now();

  console.log(
    "[CHECKOUT] Splitting fulfillment groups...",
  );

  const fulfillmentGroups =
    orderSplitter.splitOrderByFulfillment(
      cart.items,
    );

  console.log(
    `[CHECKOUT] Fulfillment groups created in ${
      Date.now() -
      fulfillmentStartedAt
    }ms`,
  );

  console.log(
    "[CHECKOUT] Fulfillment group types:",
    Object.keys(
      fulfillmentGroups,
    ),
  );

  // ----------------------------------------------------------
  // 7. TOTALS
  // ----------------------------------------------------------

  const subtotal =
    Number(
      shippingQuote.subtotal || 0,
    );

  const shippingCost =
    Number(
      shippingQuote.shippingCost || 0,
    );

  const taxAmount = 0;

  const totalAmount =
    subtotal +
    shippingCost +
    taxAmount;

  console.log(
    "[CHECKOUT] Totals:",
    {
      subtotal,
      shippingCost,
      taxAmount,
      totalAmount,
    },
  );

  console.log(
    `[CHECKOUT] Preparation complete in ${
      Date.now() - startedAt
    }ms`,
  );

  console.log(
    "========================================",
  );
  console.log("");

  return {
    cart,
    address,
    shippingQuote,
    fulfillmentGroups,
    subtotal,
    shippingCost,
    taxAmount,
    totalAmount,
  };
};

// ============================================================
// ATOMIC CHECKOUT TRANSACTION
//
// ONLY critical database writes happen here.
//
// No Paystack.
// No Redis.
// No fulfillment.
// No external services.
// ============================================================

const executeCheckoutTransaction = async ({
  userId,
  payload,
  checkoutPlan,
}) => {
  const {
    cart,
    address,
    fulfillmentGroups,
    totalAmount,
    shippingCost,
    taxAmount,
    shippingQuote,
  } = checkoutPlan;

  console.log("");
  console.log(
    "========================================",
  );
  console.log(
    "[CHECKOUT TX] STARTING TRANSACTION",
  );
  console.log(
    "========================================",
  );

  console.log(
    "[CHECKOUT TX] Cart:",
    cart.id,
  );

  console.log(
    "[CHECKOUT TX] Item count:",
    cart.items.length,
  );

  const transactionStartedAt =
    Date.now();

  return prisma.$transaction(
    async (tx) => {
      console.log(
        "[CHECKOUT TX] Transaction callback entered",
      );

      // ======================================================
      // 1. DECREMENT STOCK
      // ======================================================

      const stockStartedAt =
        Date.now();

      console.log(
        "[CHECKOUT TX] Starting stock decrement...",
      );

      for (const cartItem of cart.items) {
        const itemStartedAt =
          Date.now();

        console.log(
          "[CHECKOUT TX] Decrementing stock:",
          {
            variantId:
              cartItem.variantId,

            quantity:
              cartItem.quantity,

            sku:
              cartItem.variant?.sku,
          },
        );

        const result =
          await orderDb.decrementVariantStock(
            {
              variantId:
                cartItem.variantId,

              quantity:
                cartItem.quantity,
            },
            tx,
          );

        console.log(
          "[CHECKOUT TX] Stock decrement result:",
          {
            variantId:
              cartItem.variantId,

            count:
              result.count,

            elapsedMs:
              Date.now() -
              itemStartedAt,
          },
        );

        if (result.count === 0) {
          const variant =
            cartItem.variant;

          throw new BadRequestError(
            `${
              variant?.product?.name ||
              "Product"
            } (${
              variant?.sku ||
              "Unknown SKU"
            }) has insufficient stock`,
          );
        }
      }

      console.log(
        `[CHECKOUT TX] ALL STOCK UPDATES COMPLETE: ${
          Date.now() -
          stockStartedAt
        }ms`,
      );

      // ======================================================
      // 2. CREATE PENDING ORDER
      // ======================================================

      const orderStartedAt =
        Date.now();

      console.log(
        "[CHECKOUT TX] Creating PENDING order...",
      );

      const order =
        await orderDb.createOrderFromCart(
          {
            userId,

            payload: {
              notes:
                payload.notes,

              fulfillmentGroups,
            },

            address,
            cart,

            totalAmount,
            shippingCost,
            taxAmount,

            itemsWithCBM:
              shippingQuote.items,
          },
          tx,
        );

      console.log(
        "[CHECKOUT TX] ORDER CREATED:",
        {
          orderId:
            order.id,

          orderNumber:
            order.orderNumber,

          status:
            order.status,

          elapsedMs:
            Date.now() -
            orderStartedAt,
        },
      );

      // ======================================================
      // 3. MARK CART CHECKED OUT
      // ======================================================

      const cartStartedAt =
        Date.now();

      console.log(
        "[CHECKOUT TX] Marking cart as CHECKED_OUT...",
      );

      await cartDb.markCartAsCheckedOut(
        cart.id,
        tx,
      );

      console.log(
        `[CHECKOUT TX] CART UPDATED: ${
          Date.now() -
          cartStartedAt
        }ms`,
      );

      console.log(
        `[CHECKOUT TX] Transaction callback complete in ${
          Date.now() -
          transactionStartedAt
        }ms`,
      );

      return {
        orderId:
          order.id,

        orderNumber:
          order.orderNumber,
      };
    },
    {
      timeout: 15000,
    },
  ).then((result) => {
    console.log(
      `[CHECKOUT TX] COMMITTED successfully in ${
        Date.now() -
        transactionStartedAt
      }ms`,
    );

    console.log(
      "[CHECKOUT TX] Result:",
      result,
    );

    console.log(
      "========================================",
    );
    console.log("");

    return result;
  });
};

// ============================================================
// INITIALIZE PAYMENT
//
// IMPORTANT:
// This happens AFTER the order transaction commits.
//
// Paystack is an external service and must NEVER be called
// inside the Prisma transaction.
// ============================================================

const initializeOrderPayment = async ({
  userId,
  orderId,
}) => {
  console.log("");
  console.log(
    "========================================",
  );
  console.log(
    "[CHECKOUT PAYMENT] INITIALIZING PAYMENT",
  );
  console.log(
    "========================================",
  );

  const order =
    await orderDb.findOrderById(
      orderId,
    );

  if (!order) {
    throw new BadRequestError(
      "Order could not be loaded after checkout",
    );
  }

  const payment =
    await paymentService.initializePayment(
      {
        order,

        user: {
          id: userId,
          role: "USER",
        },
      },
    );

  console.log(
    "[CHECKOUT PAYMENT] Payment initialized:",
    {
      paymentId:
        payment.id,

      reference:
        payment.reference,

      authorizationUrl:
        payment.authorizationUrl,
    },
  );

  console.log(
    "========================================",
  );
  console.log("");

  return payment;
};

// ============================================================
// PUBLIC CHECKOUT
// ============================================================

export const checkout = async ({
  userId,
  payload = {},
}) => {
  const startedAt = Date.now();

  console.log("");
  console.log("");
  console.log(
    "########################################",
  );
  console.log(
    "########## CHECKOUT STARTED ############",
  );
  console.log(
    "########################################",
  );

  console.log(
    "[CHECKOUT] User:",
    userId,
  );

  try {
    // ========================================================
    // PHASE 1
    // Prepare everything outside transaction
    // ========================================================

    const checkoutPlan =
      await prepareCheckout({
        userId,
        payload,
      });

    // ========================================================
    // PHASE 2
    // Atomic database transaction
    // ========================================================

    const checkoutResult =
      await executeCheckoutTransaction({
        userId,
        payload,
        checkoutPlan,
      });

    // ========================================================
    // PHASE 3
    // Reload committed order
    // ========================================================

    const order =
      await orderDb.findOrderById(
        checkoutResult.orderId,
      );

    if (!order) {
      throw new BadRequestError(
        "Order could not be loaded after checkout",
      );
    }

    // ========================================================
    // PHASE 4
    // Initialize Paystack
    //
    // This happens AFTER COMMIT.
    // ========================================================

    let payment = null;

    try {
      payment =
        await initializeOrderPayment({
          userId,
          orderId:
            checkoutResult.orderId,
        });
    } catch (paymentError) {
      // ------------------------------------------------------
      // IMPORTANT:
      //
      // The order transaction has already committed.
      // We cannot roll it back because Paystack initialization
      // failed afterward.
      //
      // The order remains PENDING and can be paid later using
      // the payment initialization endpoint.
      // ------------------------------------------------------

      console.error(
        "[CHECKOUT PAYMENT] Payment initialization failed after order commit:",
        {
          orderId:
            checkoutResult.orderId,

          orderNumber:
            checkoutResult.orderNumber,

          error:
            paymentError,
        },
      );
    }

    // ========================================================
    // COMPLETE
    // ========================================================

    console.log("");
    console.log(
      "########################################",
    );
    console.log(
      `[CHECKOUT] SUCCESS - Total time: ${
        Date.now() -
        startedAt
      }ms`,
    );
    console.log(
      "[CHECKOUT] Order:",
      checkoutResult.orderNumber,
    );

    console.log(
      "[CHECKOUT] Payment:",
      payment
        ? payment.reference
        : "NOT_INITIALIZED",
    );

    console.log(
      "########################################",
    );
    console.log("");

    return {
      ...order,

      shippingQuote:
        checkoutPlan.shippingQuote,

      fulfillmentGroups:
        checkoutPlan.fulfillmentGroups,

      payment,
    };
  } catch (error) {
    console.error("");
    console.error(
      "########################################",
    );
    console.error(
      `[CHECKOUT] FAILED after ${
        Date.now() -
        startedAt
      }ms`,
    );
    console.error(
      "[CHECKOUT] Error:",
      error,
    );
    console.error(
      "########################################",
    );
    console.error("");

    throw error;
  }
};
