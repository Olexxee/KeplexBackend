import { Router } from "express";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import {
  validateBody,
  validateParams,
} from "../../middlewares/validateMiddleware.js";
import * as orderController from "./order.controller.js";
import {
  checkoutSchema,
  updateOrderStatusSchema,
  orderIdSchema,
} from "./order.validation.js";

const orderRouter = Router();

orderRouter.use(authMiddleware);

orderRouter.post(
  "/checkout",
  validateBody(checkoutSchema),
  orderController.checkout,
);

orderRouter.get("/me", orderController.getMyOrders);

orderRouter.get(
  "/",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  orderController.getAllOrders,
);

orderRouter.get("/:id", validateParams(orderIdSchema), orderController.getOrderById);

orderRouter.patch(
  "/:id/status",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(orderIdSchema),
  validateBody(updateOrderStatusSchema),
  orderController.updateOrderStatus,
);

export default orderRouter;
