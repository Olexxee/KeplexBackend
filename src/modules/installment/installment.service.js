import { prisma } from "../../config/prisma.js";
import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";
import * as installmentDb from "./installment.db.js";
import * as addressDb from "../address/address.db.js";
import * as shippingService from "../shipping/shipping.service.js";
import { orderSplitter } from "../fulfillment/order.splitter.js";
import * as orderDb from "../order/order.db.js";
import * as paystack from "../payment/paymentGateway/paystack.js";

// ============================================================
// CONSTANTS
// ============================================================

const PAYMENT_PROVIDER = "PAYSTACK";

const MAX_PRODUCT_SUBTOTAL_CENTS = 20_000_000;

// FlexPay currently allows merchandise below ₦200,000.
// Therefore ₦200,000 exactly is NOT eligible.
const MAX_PRODUCT_SUBTOTAL = 200_000;

// ============================================================
// MONEY
// ============================================================

const money = (value) => Number(Number(value).toFixed(2));

const cents = (value) => Math.round(Number(value) * 100);

const fromCents = (value) => Number((value / 100).toFixed(2));

const assertPositiveMoney = (
  value,
  message = "Amount must be greater than zero",
) => {
  const amount = money(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestError(message);
  }

  return amount;
};

// ============================================================
// PLAN NUMBER
// ============================================================

const createPlanNumber = () => {
  return installmentDb.generatePlanNumber();
};

// ============================================================
// ADDRESS
// ============================================================

const resolveAddress = async (userId, addressId) => {
  const address = await addressDb.findAddressById(addressId);

  if (!address) {
    throw new NotFoundError("Shipping address not found");
  }

  if (address.userId !== userId) {
    throw new BadRequestError(
      "Shipping address does not belong to this account",
    );
  }

  return address;
};

// ============================================================
// PRODUCT SNAPSHOT
// ============================================================

const buildProductItems = async ({
  sourceType,
  items,
  cartItemIds,
  userId,
}) => {
  if (sourceType === "PRODUCT") {
    const variantIds = items.map((item) => item.variantId);

    const variants = await installmentDb.findVariantsByIds(variantIds);

    const variantMap = new Map(
      variants.map((variant) => [variant.id, variant]),
    );

    return items.map((item) => {
      const variant = variantMap.get(item.variantId);

      if (!variant) {
        throw new NotFoundError(`Variant ${item.variantId} not found`);
      }

      if (!variant.isActive) {
        throw new BadRequestError(`${variant.sku} is no longer available`);
      }

      if (!variant.product || variant.product.status !== "ACTIVE") {
        throw new BadRequestError(
          `${variant.sku} belongs to an inactive product`,
        );
      }

      const unitPrice = money(variant.price);
      const quantity = Number(item.quantity);

      if (unitPrice <= 0) {
        throw new BadRequestError(`${variant.sku} does not have a valid price`);
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new BadRequestError(`Invalid quantity for ${variant.sku}`);
      }

      return {
        variantId: variant.id,
        sku: variant.sku,
        productName: variant.product.name,
        variantLabel:
          [variant.color, variant.size].filter(Boolean).join(" / ") || null,
        quantity,
        unitPrice,
        totalPrice: money(unitPrice * quantity),
      };
    });
  }

  const cartItems = await installmentDb.findCartItemsForPlan(
    userId,
    cartItemIds,
  );

  if (cartItems.length !== cartItemIds.length) {
    throw new BadRequestError(
      "One or more selected cart items are unavailable",
    );
  }

  return cartItems.map((cartItem) => {
    const variant = cartItem.variant;

    if (!variant || !variant.isActive) {
      throw new BadRequestError(
        `${variant?.sku || "A selected item"} is no longer available`,
      );
    }

    if (!variant.product || variant.product.status !== "ACTIVE") {
      throw new BadRequestError(
        `${variant.sku} belongs to an inactive product`,
      );
    }

    const unitPrice = money(cartItem.unitPriceSnapshot);

    const quantity = Number(cartItem.quantity);

    if (unitPrice <= 0) {
      throw new BadRequestError(`${variant.sku} does not have a valid price`);
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestError(`Invalid quantity for ${variant.sku}`);
    }

    return {
      variantId: variant.id,
      sku: variant.sku,
      productName: variant.product.name,
      variantLabel:
        [variant.color, variant.size].filter(Boolean).join(" / ") || null,
      quantity,
      unitPrice,
      totalPrice: money(unitPrice * quantity),
    };
  });
};

// ============================================================
// INSTALLMENT SCHEDULE
// ============================================================

const buildSchedule = ({
  productSubtotal,
  installmentCount,
  installmentIntervalDays,
}) => {
  const totalCents = cents(productSubtotal);

  const baseCents = Math.floor(totalCents / installmentCount);

  const remainder = totalCents % installmentCount;

  const now = new Date();

  return Array.from(
    {
      length: installmentCount,
    },
    (_, index) => {
      const amountCents = baseCents + (index < remainder ? 1 : 0);

      const dueDate = new Date(now);

      dueDate.setDate(dueDate.getDate() + index * installmentIntervalDays);

      return {
        sequence: index + 1,
        dueDate,
        amount: fromCents(amountCents),
      };
    },
  );
};

// ============================================================
// CREATE PLAN
// ============================================================

export const createPlan = async ({ userId, payload }) => {
  const address = await resolveAddress(userId, payload.addressId);

  const items = await buildProductItems({
    sourceType: payload.sourceType,
    items: payload.items,
    cartItemIds: payload.cartItemIds,
    userId,
  });

  if (!items.length) {
    throw new BadRequestError("At least one item is required");
  }

  const productSubtotal = money(
    items.reduce((sum, item) => sum + Number(item.totalPrice), 0),
  );

  if (productSubtotal <= 0) {
    throw new BadRequestError("FlexPay total must be greater than zero");
  }

  // ==========================================================
  // FLEXPAY ELIGIBILITY LIMIT
  // ==========================================================

  if (cents(productSubtotal) >= MAX_PRODUCT_SUBTOTAL_CENTS) {
    throw new BadRequestError(
      `FlexPay is currently available for merchandise totals below ₦${MAX_PRODUCT_SUBTOTAL.toLocaleString()}`,
    );
  }

  const schedule = buildSchedule({
    productSubtotal,
    installmentCount: payload.installmentCount,
    installmentIntervalDays: payload.installmentIntervalDays,
  });

  const plan = await prisma.$transaction(
    async (tx) => {
      /*
       * Serialize FlexPay plan creation for this user.
       *
       * This prevents:
       *
       * Request A → no active plan
       * Request B → no active plan
       * Request A → create
       * Request B → create
       *
       * from producing two active plans.
       */
      await installmentDb.lockUserForPlanCreation(userId, tx);

      const existingPlan = await installmentDb.findActivePlanByUser(userId, tx);

      if (existingPlan) {
        throw new BadRequestError(
          `You already have an active FlexPay plan (${existingPlan.planNumber})`,
        );
      }

      const created = await installmentDb.createPlan(
        {
          planNumber: createPlanNumber(),
          userId,
          sourceType: payload.sourceType,
          status: "ACTIVE",
          currency: "NGN",
          productSubtotal,
          shippingCost: 0,
          totalAmount: productSubtotal,
          amountPaid: 0,
          balanceDue: productSubtotal,
          installmentCount: payload.installmentCount,
          installmentIntervalDays: payload.installmentIntervalDays,
          nextDueAt: schedule[0]?.dueDate || null,
          customerName: address.fullName,
          customerEmail: address.email || null,
          customerPhone: address.phone,
          shippingLabel: address.label || null,
          shippingStreet: address.addressLine,
          shippingCity: address.city,
          shippingState: address.state || null,
          shippingCountry: address.country || "NG",
        },
        tx,
      );

      await installmentDb.createPlanItems(created.id, items, tx);

      await installmentDb.createInstallments(created.id, schedule, tx);

      return created;
    },
    {
      timeout: 15000,
    },
  );

  return installmentDb.findPlanById(plan.id);
};

// ============================================================
// PLAN READ
// ============================================================

export const getPlan = async ({ userId, planId }) => {
  const plan = await installmentDb.findPlanForUser(planId, userId);

  if (!plan) {
    throw new NotFoundError("FlexPay plan not found");
  }

  return plan;
};

export const getPlans = async (userId) => {
  return installmentDb.findUserPlans(userId);
};

// ============================================================
// PAYMENT AMOUNT
// ============================================================

const getPaymentAmount = async ({ userId, planId, requestedAmount }) => {
  const plan = await getPlan({
    userId,
    planId,
  });

  if (plan.status !== "ACTIVE" && plan.status !== "SHIPPING_DUE") {
    throw new BadRequestError(
      `FlexPay plan cannot receive payments while ${plan.status}`,
    );
  }

  const balance = money(plan.balanceDue);

  if (balance <= 0) {
    throw new BadRequestError("FlexPay plan has no outstanding balance");
  }

  const amount = money(requestedAmount);

  if (amount <= 0) {
    throw new BadRequestError("Payment amount must be greater than zero");
  }

  if (amount > balance) {
    throw new BadRequestError(
      `Payment cannot exceed the current balance of ${balance.toFixed(2)}`,
    );
  }

  return {
    plan,
    amount,
  };
};

// ============================================================
// INITIALIZE PAYSTACK
// ============================================================

// ============================================================
// INITIALIZE PAYSTACK
// ============================================================

export const initializePayment = async ({ userId, planId, amount }) => {
  const result = await getPaymentAmount({
    userId,
    planId,
    requestedAmount: amount,
  });

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!user.email) {
    throw new BadRequestError("A valid email address is required for Paystack");
  }

  return prisma.$transaction(
    async (tx) => {
      const lockedPlan = await installmentDb.lockPlan(planId, tx);

      if (!lockedPlan) {
        throw new NotFoundError("FlexPay plan not found");
      }

      if (lockedPlan.userId !== userId) {
        throw new NotFoundError("FlexPay plan not found");
      }

      if (
        lockedPlan.status !== "ACTIVE" &&
        lockedPlan.status !== "SHIPPING_DUE"
      ) {
        throw new BadRequestError(
          `FlexPay plan cannot receive payments while ${lockedPlan.status}`,
        );
      }

      const currentBalance = money(lockedPlan.balanceDue);

      if (currentBalance <= 0) {
        throw new BadRequestError("FlexPay plan has no outstanding balance");
      }

      const paymentAmount = money(amount);

      if (paymentAmount <= 0) {
        throw new BadRequestError("Payment amount must be greater than zero");
      }

      if (paymentAmount > currentBalance) {
        throw new BadRequestError(
          `Payment cannot exceed the current balance of ${currentBalance.toFixed(
            2,
          )}`,
        );
      }

      // ------------------------------------------------------
      // CHECK EXISTING PENDING PAYMENT
      // ------------------------------------------------------

      const existingPayment =
        await installmentDb.findPendingPaymentByPlan(planId, tx);

      if (existingPayment) {
        const existingAmount = money(existingPayment.amount);

        /*
         * A pending Paystack payment can only be reused if it
         * represents the exact same amount and Paystack still
         * recognizes the transaction.
         */

        if (
          existingAmount === paymentAmount &&
          existingPayment.authorizationUrl &&
          existingPayment.accessCode
        ) {
          let verification = null;

          try {
            verification = await paystack.verifyTransaction(
              existingPayment.reference,
            );
          } catch {
            /*
             * Paystack can no longer resolve this transaction.
             *
             * The local pending payment is therefore no longer
             * safe to reuse.
             */
          }

          // --------------------------------------------------
          // ALREADY SUCCESSFUL
          // --------------------------------------------------

          if (verification?.status === "SUCCESS") {
            return {
              planId: lockedPlan.id,
              planNumber: lockedPlan.planNumber,
              paymentId: existingPayment.id,
              reference: existingPayment.reference,
              authorizationUrl: existingPayment.authorizationUrl,
              accessCode: existingPayment.accessCode,
              amount: existingAmount,
              currency: existingPayment.currency,
              status: "SUCCESS",
            };
          }
          
          // --------------------------------------------------
          // STILL PENDING AT PAYSTACK
          // --------------------------------------------------

          if (verification?.status === "PENDING") {
            return {
              planId: lockedPlan.id,
              planNumber: lockedPlan.planNumber,
              paymentId: existingPayment.id,
              reference: existingPayment.reference,
              authorizationUrl: existingPayment.authorizationUrl,
              accessCode: existingPayment.accessCode,
              amount: existingAmount,
              currency: existingPayment.currency,
              status: existingPayment.status,
            };
          }

          // --------------------------------------------------
          // NO LONGER USABLE
          // --------------------------------------------------

          await installmentDb.updatePlanPayment(
            existingPayment.id,
            {
              status: verification?.status || "ABANDONED",

              ...(verification?.raw && {
                providerPayload: verification.raw,
              }),
            },
            tx,
          );
        } else {
          /*
           * The existing payment cannot safely be reused because
           * its amount or Paystack authorization data does not
           * match the current request.
           */

          await installmentDb.updatePlanPayment(
            existingPayment.id,
            {
              status: "ABANDONED",
            },
            tx,
          );
        }
      }

      // ------------------------------------------------------
      // CREATE FRESH PAYSTACK TRANSACTION
      // ------------------------------------------------------

      const reference = paystack.generateReference("KPX-FLEX");

      const init = await paystack.initializeTransaction({
        email: user.email,
        amount: paymentAmount,
        reference,
        metadata: {
          paymentType: "INSTALLMENT_PAYMENT",
          installmentPlanId: lockedPlan.id,
          planNumber: lockedPlan.planNumber,
          userId,
        },
      });

      const payment = await installmentDb.createPlanPayment(
        {
          installmentPlan: {
            connect: {
              id: lockedPlan.id,
            },
          },

          paymentType: "INSTALLMENT_PAYMENT",

          provider: PAYMENT_PROVIDER,

          reference,

          amount: paymentAmount,

          currency: "NGN",

          status: "PENDING",

          authorizationUrl: init.authorization_url,

          accessCode: init.access_code,

          providerPayload: init.raw,
        },
        tx,
      );

      return {
        planId: lockedPlan.id,
        planNumber: lockedPlan.planNumber,
        paymentId: payment.id,
        reference,
        authorizationUrl: init.authorization_url,
        accessCode: init.access_code,
        amount: paymentAmount,
        currency: "NGN",
        status: "PENDING",
      };
    },
    {
      timeout: 30000,
    },
  );
};


// ============================================================
// SHIPPING ITEMS
// ============================================================

const loadShippingItems = async (plan) => {
  const variantIds = plan.items.map((item) => item.variantId);

  const variants = await installmentDb.findVariantsByIds(variantIds);

  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

  return plan.items.map((planItem) => {
    const variant = variantMap.get(planItem.variantId);

    if (!variant || !variant.isActive) {
      throw new BadRequestError(`${planItem.sku} is no longer available`);
    }

    if (!variant.product || variant.product.status !== "ACTIVE") {
      throw new BadRequestError(`${planItem.sku} product is no longer active`);
    }

    return {
      variantId: variant.id,
      name: variant.product.name,
      quantity: Number(planItem.quantity),
      unitPrice: Number(planItem.unitPrice),
      length: variant.length != null ? Number(variant.length) : null,
      width: variant.width != null ? Number(variant.width) : null,
      height: variant.height != null ? Number(variant.height) : null,
      actualWeight:
        variant.actualWeight != null ? Number(variant.actualWeight) : 0,
      shippingType: variant.shippingType || "LOCAL",
      fulfillmentType: variant.fulfillmentType || "LOCAL",
    };
  });
};

// ============================================================
// SHIPPING RECALCULATION
// ============================================================

const recalculateShipping = async (plan) => {
  const items = await loadShippingItems(plan);

  const quote = await shippingService.calculateShippingQuote({
    items,

    destination: {
      city: plan.shippingCity,
      state: plan.shippingState,
      country: plan.shippingCountry || "NG",
    },
  });

  return {
    quote,
    items,
  };
};

// ============================================================
// SHIPPING STATE
// ============================================================

const calculateShippingState = async (plan) => {
  const shipping = await recalculateShipping(plan);

  const shippingCost = money(shipping.quote.shippingCost || 0);

  const totalAmount = money(Number(plan.productSubtotal) + shippingCost);

  const amountPaid = money(plan.amountPaid);

  const balanceDue = money(totalAmount - amountPaid);

  return {
    shipping,
    shippingCost,
    totalAmount,
    amountPaid,
    balanceDue,
  };
};

// ============================================================
// ORDER FINALIZATION
// ============================================================

const finalizeOrder = async ({ planId }) => {
  return prisma.$transaction(
    async (tx) => {
      const plan = await installmentDb.lockPlan(planId, tx);

      if (!plan) {
        throw new NotFoundError("FlexPay plan not found");
      }

      // ------------------------------------------------------
      // IDEMPOTENCY
      // ------------------------------------------------------

      if (plan.status === "COMPLETED") {
        return {
          alreadyCompleted: true,
          orderId: plan.orderId,
          orderNumber: plan.order?.orderNumber,
        };
      }

      // ------------------------------------------------------
      // ORDER ALREADY EXISTS
      // ------------------------------------------------------

      if (plan.orderId) {
        await tx.installmentPlan.update({
          where: {
            id: plan.id,
          },

          data: {
            status: "COMPLETED",
            balanceDue: 0,
            amountPaid: plan.totalAmount,
            completedAt: plan.completedAt || new Date(),
            nextDueAt: null,
          },
        });

        return {
          alreadyCompleted: true,
          orderId: plan.orderId,
          orderNumber: plan.order?.orderNumber,
        };
      }

      // ------------------------------------------------------
      // PLAN MUST BE READY
      // ------------------------------------------------------

      if (plan.status !== "SHIPPING_DUE" && money(plan.balanceDue) > 0) {
        throw new BadRequestError("FlexPay plan is not fully paid");
      }

      // ------------------------------------------------------
      // SHIPPING
      // ------------------------------------------------------

      const shippingState = await calculateShippingState(plan);

      const { shipping, shippingCost, totalAmount, amountPaid, balanceDue } =
        shippingState;

      // ------------------------------------------------------
      // SHIPPING STILL OUTSTANDING
      // ------------------------------------------------------

      if (balanceDue > 0) {
        await installmentDb.updatePlanBalance(
          plan.id,
          {
            amountPaid,
            balanceDue,
            shippingCost,
            totalAmount,
            status: "SHIPPING_DUE",
            nextDueAt: null,
          },
          tx,
        );

        return {
          shippingDue: true,
          planId: plan.id,
          shippingCost,
          totalAmount,
          amountPaid,
          balanceDue,
        };
      }

      // ------------------------------------------------------
      // STOCK
      // ------------------------------------------------------

      for (const item of plan.items) {
        const result = await orderDb.decrementVariantStock(
          {
            variantId: item.variantId,
            quantity: Number(item.quantity),
          },
          tx,
        );

        if (result.count !== 1) {
          await installmentDb.updatePlanBalance(
            plan.id,
            {
              amountPaid,
              balanceDue: 0,
              shippingCost,
              totalAmount,
              status: "ORDER_FAILED",
              nextDueAt: null,
            },
            tx,
          );

          throw new BadRequestError(`Insufficient stock for ${item.sku}`);
        }
      }

      // ------------------------------------------------------
      // FULFILLMENT
      // ------------------------------------------------------

      const cartLikeItems = shipping.items.map((item) => ({
        variant: {
          fulfillmentType: item.fulfillmentType,
        },

        variantId: item.variantId,

        quantity: item.quantity,

        unitPriceSnapshot: item.unitPrice,
      }));

      const fulfillmentGroups =
        orderSplitter.splitOrderByFulfillment(cartLikeItems);

      // ------------------------------------------------------
      // ADDRESS SNAPSHOT
      // ------------------------------------------------------

      const address = {
        fullName: plan.customerName,
        email: plan.customerEmail,
        phone: plan.customerPhone,
        label: plan.shippingLabel,
        addressLine: plan.shippingStreet,
        city: plan.shippingCity,
        state: plan.shippingState,
        country: plan.shippingCountry || "NG",
      };

      // ------------------------------------------------------
      // CREATE ORDER
      // ------------------------------------------------------

      const order = await orderDb.createOrderFromInstallmentPlan(
        {
          userId: plan.userId,

          payload: {
            notes: `FlexPay plan ${plan.planNumber}`,
            fulfillmentGroups,
          },

          address,

          plan,

          totalAmount,

          shippingCost,

          taxAmount: 0,

          itemsWithCBM: shipping.quote.items,
        },
        tx,
      );

      // ------------------------------------------------------
      // LINK PLAN
      // ------------------------------------------------------

      await installmentDb.attachPlanToOrder(plan.id, order.id, tx);

      await installmentDb.attachPlanPaymentsToOrder(plan.id, order.id, tx);

      // ------------------------------------------------------
      // COMPLETE PLAN
      // ------------------------------------------------------

      await tx.installmentPlan.update({
        where: {
          id: plan.id,
        },

        data: {
          status: "COMPLETED",
          totalAmount,
          shippingCost,
          amountPaid: totalAmount,
          balanceDue: 0,
          completedAt: new Date(),
          nextDueAt: null,
        },
      });

      // ------------------------------------------------------
      // FLEXPAY ORDER IS FULLY PAID
      // ------------------------------------------------------

      await tx.order.update({
        where: {
          id: order.id,
        },

        data: {
          status: "CONFIRMED",
        },
      });

      return {
        completed: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
      };
    },
    {
      timeout: 30000,
    },
  );
};

// ============================================================
// PAYMENT ALLOCATION
// ============================================================

const allocatePayment = async (paymentId, planId, paymentAmount, tx) => {
  let remaining = money(paymentAmount);

  if (remaining <= 0) {
    return;
  }

  const installments = await tx.installment.findMany({
    where: {
      planId,

      status: {
        in: ["PENDING", "PARTIALLY_PAID"],
      },
    },

    orderBy: {
      sequence: "asc",
    },
  });

  for (const installment of installments) {
    if (remaining <= 0) {
      break;
    }

    const installmentAmount = money(installment.amount);

    const alreadyPaid = money(installment.amountPaid);

    const installmentBalance = money(installmentAmount - alreadyPaid);

    if (installmentBalance <= 0) {
      continue;
    }

    const allocationAmount = money(Math.min(remaining, installmentBalance));

    const newPaid = money(alreadyPaid + allocationAmount);

    const fullyPaid = newPaid >= installmentAmount;

    await installmentDb.createAllocation(
      {
        paymentId,

        installmentId: installment.id,

        amount: allocationAmount,
      },
      tx,
    );

    await installmentDb.updateInstallment(
      installment.id,
      {
        amountPaid: newPaid,

        status: fullyPaid ? "PAID" : "PARTIALLY_PAID",

        paidAt: fullyPaid ? new Date() : null,
      },
      tx,
    );

    remaining = money(remaining - allocationAmount);
  }

  if (remaining > 0) {
    throw new BadRequestError(
      "Payment exceeds the remaining FlexPay installment balance",
    );
  }
};

// ============================================================
// AFTER SUCCESSFUL PAYSTACK PAYMENT
// ============================================================

export const processSuccessfulPayment = async ({
  reference,
  providerPayload,
}) => {
  const result = await prisma.$transaction(
    async (tx) => {
      const payment = await installmentDb.findPlanPaymentByReference(
        reference,
        tx,
      );

      if (!payment) {
        throw new NotFoundError("FlexPay payment not found");
      }

      if (payment.paymentType !== "INSTALLMENT_PAYMENT") {
        return {
          handled: false,
        };
      }

      const planId = payment.installmentPlanId;

      if (!planId) {
        throw new BadRequestError("FlexPay payment has no plan");
      }

      // --------------------------------------------------
      // LOCK PLAN FIRST
      // --------------------------------------------------
      //
      // Every payment for the same plan must serialize
      // through this lock.
      //
      // This prevents:
      //
      // A reads ₦20k
      // B reads ₦20k
      // A writes ₦30k
      // B writes ₦35k
      //
      // and losing A's payment.
      //

      const plan = await installmentDb.lockPlan(planId, tx);

      if (!plan) {
        throw new NotFoundError("FlexPay plan not found");
      }

      // --------------------------------------------------
      // ALREADY PROCESSED
      // --------------------------------------------------

      if (payment.status === "SUCCESS") {
        return {
          handled: true,
          alreadyProcessed: true,
          planId: plan.id,
          orderId: plan.orderId || null,
        };
      }

      // --------------------------------------------------
      // NON-PENDING PAYMENT
      // --------------------------------------------------

      if (payment.status !== "PENDING") {
        return {
          handled: true,
          alreadyProcessed: true,
          planId: plan.id,
          orderId: plan.orderId || null,
        };
      }

      // --------------------------------------------------
      // PLAN STATE
      // --------------------------------------------------

      if (plan.status !== "ACTIVE" && plan.status !== "SHIPPING_DUE") {
        return {
          handled: true,
          alreadyProcessed: true,
          planId: plan.id,
          orderId: plan.orderId || null,
        };
      }

      // --------------------------------------------------
      // CLAIM PAYMENT
      // --------------------------------------------------

      const claimed = await installmentDb.transitionPaymentStatus(
        reference,
        "PENDING",
        "SUCCESS",
        providerPayload,
        tx,
      );

      if (!claimed) {
        return {
          handled: true,
          alreadyProcessed: true,
          planId: plan.id,
          orderId: plan.orderId || null,
        };
      }

      // --------------------------------------------------
      // PAYMENT AMOUNT
      // --------------------------------------------------

      const paymentAmount = assertPositiveMoney(
        payment.amount,
        "FlexPay payment amount is invalid",
      );

      const currentAmountPaid = money(plan.amountPaid);

      const newAmountPaid = money(currentAmountPaid + paymentAmount);

      // --------------------------------------------------
      // SHIPPING-DUE PLAN
      // --------------------------------------------------

      if (plan.status === "SHIPPING_DUE") {
        const balanceDue = money(Number(plan.totalAmount) - newAmountPaid);

        if (balanceDue < 0) {
          throw new BadRequestError(
            "FlexPay payment exceeds the current plan balance",
          );
        }

        await installmentDb.updatePlanBalance(
          plan.id,
          {
            amountPaid: newAmountPaid,

            balanceDue,

            status: balanceDue <= 0 ? "SHIPPING_DUE" : "SHIPPING_DUE",

            nextDueAt: null,

            firstPaymentAt: plan.firstPaymentAt || new Date(),
          },
          tx,
        );

        return {
          handled: true,
          planId: plan.id,
          amountPaid: newAmountPaid,
          balanceDue,
          readyForOrder: balanceDue <= 0,
        };
      }

      // --------------------------------------------------
      // ACTIVE PLAN
      // --------------------------------------------------

      await allocatePayment(payment.id, plan.id, paymentAmount, tx);

      const productSubtotal = money(plan.productSubtotal);

      const productBalance = money(productSubtotal - newAmountPaid);

      if (productBalance > 0) {
        const nextInstallment = await tx.installment.findFirst({
          where: {
            planId: plan.id,

            status: {
              in: ["PENDING", "PARTIALLY_PAID"],
            },
          },

          orderBy: {
            sequence: "asc",
          },
        });

        await installmentDb.updatePlanBalance(
          plan.id,
          {
            amountPaid: newAmountPaid,

            balanceDue: productBalance,

            status: "ACTIVE",

            nextDueAt: nextInstallment?.dueDate || null,

            firstPaymentAt: plan.firstPaymentAt || new Date(),
          },
          tx,
        );

        return {
          handled: true,
          planId: plan.id,
          amountPaid: newAmountPaid,
          balanceDue: productBalance,
          readyForOrder: false,
        };
      }

      // --------------------------------------------------
      // PRODUCT FULLY PAID
      // --------------------------------------------------

      await installmentDb.updatePlanBalance(
        plan.id,
        {
          amountPaid: newAmountPaid,

          balanceDue: 0,

          status: "ACTIVE",

          nextDueAt: null,

          firstPaymentAt: plan.firstPaymentAt || new Date(),
        },
        tx,
      );

      return {
        handled: true,
        planId: plan.id,
        amountPaid: newAmountPaid,
        productSubtotal,
        productPaid: true,
      };
    },

    {
      timeout: 30000,
    },
  );

  // ========================================================
  // RESULT HANDLING
  // ========================================================

  if (!result.handled) {
    return result;
  }

  if (result.alreadyProcessed) {
    return result;
  }

  // ========================================================
  // SHIPPING PAYMENT COMPLETE
  // ========================================================

  if (result.readyForOrder) {
    return finalizeOrder({
      planId: result.planId,
    });
  }

  // ========================================================
  // PRODUCT SUBTOTAL COMPLETE
  // ========================================================

  if (result.productPaid) {
    const plan = await installmentDb.findPlanById(result.planId);

    if (!plan) {
      throw new NotFoundError("FlexPay plan not found after payment");
    }

    if (plan.status === "COMPLETED") {
      return {
        handled: true,
        alreadyCompleted: true,
        planId: plan.id,
        orderId: plan.orderId,
      };
    }

    if (plan.status === "SHIPPING_DUE") {
      return {
        handled: true,
        planId: plan.id,
        amountPaid: money(plan.amountPaid),
        balanceDue: money(plan.balanceDue),
        shippingDue: true,
      };
    }

    const shippingState = await calculateShippingState({
      ...plan,
      amountPaid: result.amountPaid,
    });

    const { shippingCost, totalAmount, balanceDue } = shippingState;

    // ------------------------------------------------------
    // SHIPPING DUE
    // ------------------------------------------------------

    if (balanceDue > 0) {
      await prisma.$transaction(
        async (tx) => {
          const latestPlan = await installmentDb.lockPlan(result.planId, tx);

          if (!latestPlan) {
            throw new NotFoundError("FlexPay plan not found");
          }

          if (
            latestPlan.status === "COMPLETED" ||
            latestPlan.status === "SHIPPING_DUE"
          ) {
            return;
          }

          await installmentDb.updatePlanBalance(
            latestPlan.id,
            {
              amountPaid: result.amountPaid,

              balanceDue,

              shippingCost,

              totalAmount,

              status: "SHIPPING_DUE",

              nextDueAt: null,

              firstPaymentAt: latestPlan.firstPaymentAt || new Date(),
            },
            tx,
          );
        },

        {
          timeout: 15000,
        },
      );

      return {
        handled: true,
        planId: result.planId,
        amountPaid: result.amountPaid,
        shippingCost,
        totalAmount,
        balanceDue,
        shippingDue: true,
      };
    }

    // ------------------------------------------------------
    // SHIPPING IS ZERO / COVERED
    // ------------------------------------------------------

    return finalizeOrder({
      planId: result.planId,
    });
  }

  return result;
};
