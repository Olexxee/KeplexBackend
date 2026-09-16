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
// CONFIGURATION
// ============================================================

shippingRouter.post(
  "/configurations",
  authMiddleware,
  roleMiddleware,
  validate(createShippingConfigSchema),
  shippingController.createShippingConfig,
);

shippingRouter.get(
  "/configurations",
  authMiddleware,
  roleMiddleware,
  shippingController.getShippingConfigs,
);

shippingRouter.get(
  "/configurations/active",
  authMiddleware,
  shippingController.getActiveShippingConfig,
);

shippingRouter.get(
  "/configurations/:id",
  authMiddleware,
  roleMiddleware,
  shippingController.getShippingConfig,
);

shippingRouter.patch(
  "/configurations/:id",
  authMiddleware,
  roleMiddleware,
  validateBody(updateShippingConfigSchema),
  shippingController.updateShippingConfig,
);

// ============================================================
// SHIPPING RULES
// ============================================================

shippingRouter.post(
  "/rules",
  authMiddleware,
  roleMiddleware,
  validateBody(createShippingRuleSchema),
  shippingController.createShippingRule,
);

shippingRouter.get(
  "/rules",
  authMiddleware,
  roleMiddleware,
  shippingController.getShippingRules,
);

shippingRouter.get(
  "/rules/:id",
  authMiddleware,
  roleMiddleware,
  shippingController.getShippingRule,
);

shippingRouter.patch(
  "/rules/:id",
  authMiddleware,
  roleMiddleware,
  validateBody(updateShippingRuleSchema),
  shippingController.updateShippingRule,
);

shippingRouter.delete(
  "/rules/:id",
  authMiddleware,
  roleMiddleware,
  shippingController.deleteShippingRule,
);

// ============================================================
// SHIPPING CALCULATIONS
// ============================================================

shippingRouter.post(
  "/calculate-cbm",
  authMiddleware,
  roleMiddleware,
  validateBody(variantCBMSchema),
  shippingController.calculateCBMForVariant,
);

shippingRouter.post(
  "/orders/calculate-cbm",
  authMiddleware,
  roleMiddleware,
  validateBody(orderCBMSchema),
  shippingController.updateOrderWithCBM,
);

export default shippingRouter;

