import { z } from "zod";

const warehouseTypes = ["LOCAL", "IMPORT", "PREORDER", "DIGITAL"];

export const warehouseIdSchema = z.object({
  id: z.string().min(1, "Warehouse ID is required"),
});

export const createWarehouseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Warehouse name must be at least 2 characters")
    .max(120, "Warehouse name cannot exceed 120 characters"),

  code: z
    .string()
    .trim()
    .min(2, "Warehouse code is required")
    .max(50, "Warehouse code cannot exceed 50 characters")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Warehouse code must contain only uppercase letters, numbers, underscores, or hyphens",
    ),

  type: z.enum(warehouseTypes).default("LOCAL"),

  address: z
    .string()
    .trim()
    .max(255, "Address cannot exceed 255 characters")
    .optional()
    .nullable(),

  city: z
    .string()
    .trim()
    .max(100, "City cannot exceed 100 characters")
    .optional()
    .nullable(),

  state: z
    .string()
    .trim()
    .max(100, "State cannot exceed 100 characters")
    .optional()
    .nullable(),

  country: z
    .string()
    .trim()
    .max(100, "Country cannot exceed 100 characters")
    .optional()
    .nullable(),

  isActive: z.boolean().default(true),
});

export const updateWarehouseSchema = createWarehouseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one warehouse field is required",
  });

export const warehouseQuerySchema = z.object({
  type: z.enum(warehouseTypes).optional(),

  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
