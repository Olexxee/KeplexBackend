import { Worker } from "bullmq";
import { redisConnection } from "../../config/redis.js";
import { prisma } from "../../config/prisma.js";
import * as orderDb from "../../modules/order/order.db.js";
import * as fulfillmentService from "../../modules/fulfillment/fulfillment.service.js";
import * as auditService from "../../modules/audit/audit.service.js";
import { orderSplitter } from "../../modules/fulfillment/order.splitter.js";
import { ORDER_QUEUE_NAME } from "../queues/order.queue.js";

// ============================================================
// ORDER PAYMENT CONFIRMED
// ============================================================

const processOrderPaymentConfirmed = async (job) => {
  const {
    orderId,
    paymentId,
    reference,
    userId,
  } = job.data;

  if (!orderId) {
    throw new Error(
      "ORDER_PAYMENT_CONFIRMED job is missing orderId",
    );
  }

  console.log(
    `💳 Processing payment-confirmed job ${job.id} for order ${orderId}`,
  );

  // ----------------------------------------------------------
  // LOAD ORDER
  // ----------------------------------------------------------

  const order = await orderDb.findOrderById(orderId);

  if (!order) {
    throw new Error(
      `Order not found: ${orderId}`,
    );
  }

  // ----------------------------------------------------------
  // IDEMPOTENCY
  //
  // If fulfillments already exist, this job has already been
  // processed successfully or partially processed.
  // ----------------------------------------------------------

  if (order.fulfillments?.length > 0) {
    console.log(
      `ℹ️ Fulfillments already exist for order ${order.orderNumber}. Skipping creation.`,
    );

    return {
      orderId,
      orderNumber: order.orderNumber,
      skipped: true,
      reason: "FULFILLMENTS_ALREADY_EXIST",
    };
  }

  // ----------------------------------------------------------
  // VERIFY PAYMENT
  //
  // The webhook should only enqueue this job after the payment
  // has been confirmed as SUCCESS.
  //
  // We still verify the persisted payment here because workers
  // must not blindly trust job payloads.
  // ----------------------------------------------------------

  const payment = order.payments?.find(
    (item) =>
      item.id === paymentId ||
      item.reference === reference,
  );

  if (!payment) {
    throw new Error(
      `Payment ${paymentId || reference || "unknown"} not found for order ${orderId}`,
    );
  }

  if (payment.status !== "SUCCESS") {
    throw new Error(
      `Payment ${payment.reference} is not successful. Current status: ${payment.status}`,
    );
  }

  // ----------------------------------------------------------
  // ORDER STATE
  // ----------------------------------------------------------

  if (
    order.status !== "CONFIRMED" &&
    order.status !== "PROCESSING"
  ) {
    throw new Error(
      `Order ${order.orderNumber} is not ready for fulfillment. Current status: ${order.status}`,
    );
  }

  // ----------------------------------------------------------
  // SPLIT ORDER
  //
  // Order items already contain:
  //
  // item.variant.fulfillmentType
  //
  // so the worker reconstructs the fulfillment groups from
  // persisted order data.
  // ----------------------------------------------------------

  const fulfillmentGroups =
    orderSplitter.splitOrderByFulfillment(
      order.items,
    );

  if (
    Object.keys(fulfillmentGroups).length === 0
  ) {
    console.log(
      `ℹ️ Order ${order.orderNumber} contains no fulfillment items.`,
    );

    return {
      orderId,
      orderNumber: order.orderNumber,
      skipped: true,
      reason: "NO_FULFILLMENT_ITEMS",
    };
  }

  // ----------------------------------------------------------
  // PREPARE FULFILLMENT PLAN
  //
  // This resolves warehouses according to fulfillment type.
  // DIGITAL returns warehouseId = null.
  // ----------------------------------------------------------

  const fulfillmentPlan =
    await fulfillmentService.prepareFulfillmentPlan(
      fulfillmentGroups,
    );

  console.log(
    `📦 Fulfillment plan prepared for order ${order.orderNumber}`,
    fulfillmentPlan,
  );

  // ----------------------------------------------------------
  // CREATE FULFILLMENTS
  //
  // Creation remains transactional.
  // ----------------------------------------------------------

  await prisma.$transaction(
    async (tx) => {
      // Re-check inside the transaction to protect against
      // duplicate workers processing the same order at once.
      const existingFulfillments =
        await tx.fulfillment.findMany({
          where: {
            orderId,
          },
          select: {
            id: true,
          },
        });

      if (existingFulfillments.length > 0) {
        console.log(
          `ℹ️ Fulfillments were created concurrently for order ${order.orderNumber}.`,
        );

        return;
      }

      await fulfillmentService.createFulfillmentsForOrder({
        orderId,
        fulfillmentPlan,
        tx,
      });
    },
    {
      timeout: 15000,
    },
  );

  // ----------------------------------------------------------
  // AUDIT
  // ----------------------------------------------------------

  await auditService.logAudit({
    userId: userId || order.userId || null,
    action: "ORDER_PAYMENT_CONFIRMED",
    entity: "ORDER",
    entityId: orderId,
    metadata: {
      orderId,
      orderNumber: order.orderNumber,
      paymentId: payment.id,
      reference: payment.reference,
      source: "ORDER_PAYMENT_CONFIRMED_WORKER",
    },
  });

  console.log(
    `✅ Fulfillment processing completed for order ${order.orderNumber}`,
  );

  return {
    orderId,
    orderNumber: order.orderNumber,
    fulfillmentCount: fulfillmentPlan.length,
    skipped: false,
  };
};

// ============================================================
// WORKER
// ============================================================

export const orderWorker = new Worker(
  ORDER_QUEUE_NAME,
  processOrderPaymentConfirmed,
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

// ============================================================
// EVENTS
// ============================================================

orderWorker.on("completed", (job, result) => {
  console.log(
    `✅ Order job completed: ${job.id}`,
    result,
  );
});

orderWorker.on("failed", (job, error) => {
  console.error(
    `❌ Order job failed: ${job?.id || "unknown"}`,
    error,
  );
});

orderWorker.on("error", (error) => {
  console.error(
    "❌ Order worker error:",
    error,
  );
});

console.log(
  "✅ Order background worker initialized",
);
