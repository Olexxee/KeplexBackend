import { Router } from "express";
import * as shippingController from "./shipping.controller.js";
import {
  createShippingConfigSchema,
  updateShippingConfigSchema,
  createShippingRuleSchema,
  updateShippingRuleSchema,
  shippingQuoteSchema,
  variantCBMSchema,
  orderCBMSchema,
} from "./shipping.validation.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";

const shippingRouter = Router();

// ============================================================
// SHIPPING QUOTE
// ============================================================

shippingRouter.post(
  "/quote",
  validateBody(shippingQuoteSchema),
  shippingController.calculateShippingQuote,
);

// ============================================================
// SHIPPING CONFIGURATION
// ============================================================

shippingRouter.post(
  "/configurations",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  validateBody(createShippingConfigSchema),
  shippingController.createShippingConfig,
);

shippingRouter.get(
  "/configurations",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  shippingController.getShippingConfigs,
);

shippingRouter.get(
  "/configurations/active",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  shippingController.getActiveShippingConfig,
);

shippingRouter.get(
  "/configurations/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  shippingController.getShippingConfig,
);

shippingRouter.patch(
  "/configurations/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  validateBody(updateShippingConfigSchema),
  shippingController.updateShippingConfig,
);

// ============================================================
// SHIPPING RULES
// ============================================================

shippingRouter.post(
  "/rules",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  validateBody(createShippingRuleSchema),
  shippingController.createShippingRule,
);

shippingRouter.get(
  "/rules",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  shippingController.getShippingRules,
);

shippingRouter.get(
  "/rules/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  shippingController.getShippingRule,
);

shippingRouter.patch(
  "/rules/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  validateBody(updateShippingRuleSchema),
  shippingController.updateShippingRule,
);

shippingRouter.delete(
  "/rules/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  shippingController.deleteShippingRule,
);

// ============================================================
// SHIPPING CALCULATIONS
// ============================================================

shippingRouter.post(
  "/calculate-cbm",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  validateBody(variantCBMSchema),
  shippingController.calculateCBMForVariant,
);

shippingRouter.post(
  "/orders/calculate-cbm",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  validateBody(orderCBMSchema),
  shippingController.updateOrderWithCBM,
);

export default shippingRouter;

