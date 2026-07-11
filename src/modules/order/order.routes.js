// modules/orders/order.routes.js
import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";
import * as orderController from "./order.controller.js";
import {
  checkoutSchema,
  updateOrderStatusSchema,
  orderIdSchema,
  orderNumberSchema,
  getMyOrdersQuerySchema,
  getAllOrdersQuerySchema,
  updateCBMSchema,
} from "./order.validation.js";

const orderRouter = Router();

orderRouter.use(authMiddleware);

// Checkout
orderRouter.post(
  "/checkout",
  validateBody(checkoutSchema),
  orderController.checkout,
);

// Customer routes
orderRouter.get(
  "/me",
  validateQuery(getMyOrdersQuerySchema),
  orderController.getMyOrders,
);

orderRouter.get(
  "/me/timeline/:id",
  validateParams(orderIdSchema),
  orderController.getOrderTimeline,
);

orderRouter.get(
  "/by-number/:orderNumber",
  validateParams(orderNumberSchema),
  orderController.getOrderByOrderNumber,
);

// Admin routes
orderRouter.get(
  "/",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateQuery(getAllOrdersQuerySchema),
  orderController.getAllOrders,
);

orderRouter.get(
  "/metrics",
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  orderController.getOrderMetrics,
);

orderRouter.get(
  "/fulfillment/:fulfillmentType",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  orderController.getOrdersByFulfillmentType,
);

orderRouter.get(
  "/:id",
  validateParams(orderIdSchema),
  orderController.getOrderById,
);

orderRouter.get(
  "/:id/timeline",
  validateParams(orderIdSchema),
  orderController.getOrderTimeline,
);

orderRouter.patch(
  "/:id/status",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(orderIdSchema),
  validateBody(updateOrderStatusSchema),
  orderController.updateOrderStatus,
);

orderRouter.patch(
  "/:id/cbm",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(orderIdSchema),
  validateBody(updateCBMSchema),
  orderController.updateOrderCBM,
);

export default orderRouter;
