import { z } from "zod";

const fulfillmentTypes = ["LOCAL", "IMPORT", "PREORDER", "DIGITAL"];

const fulfillmentStatuses = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export const fulfillmentIdSchema = z.object({
  id: z.string().min(1, "Fulfillment ID is required"),
});

export const orderIdSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
});

export const updateFulfillmentStatusSchema = z.object({
  status: z.enum(fulfillmentStatuses),
});

export const updateFulfillmentTrackingSchema = z.object({
  trackingNumber: z.string().trim().min(1, "Tracking number is required"),

  carrier: z.string().trim().min(1, "Carrier is required"),

  trackingUrl: z
    .string()
    .url("Tracking URL must be a valid URL")
    .nullable()
    .optional(),

  estimatedDelivery: z.coerce.date().nullable().optional(),
});

export const fulfillmentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  orderId: z.string().min(1).optional(),

  type: z.enum(fulfillmentTypes).optional(),

  status: z.enum(fulfillmentStatuses).optional(),

  warehouseId: z.string().min(1).optional(),
});

export { fulfillmentTypes, fulfillmentStatuses };
