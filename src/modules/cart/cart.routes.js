import { Router } from "express";

import {
  validateBody,
  validateParams,
} from "../../middlewares/validateMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import * as cartController from "./cart.controller.js";
import {
  addCartItemSchema,
  updateCartItemSchema,
  cartItemIdSchema,
} from "./cart.validation.js";

const cartRouter = Router();

cartRouter.use(authMiddleware);

cartRouter.get("/", cartController.getCart);

cartRouter.post(
  "/items",
  validateBody(addCartItemSchema),
  cartController.addItemToCart,
);

cartRouter.patch(
  "/items/:itemId",
  validateParams(cartItemIdSchema),
  validateBody(updateCartItemSchema),
  cartController.updateCartItem,
);

cartRouter.delete(
  "/items/:itemId",
  validateParams(cartItemIdSchema),
  cartController.removeCartItem,
);

cartRouter.delete("/clear", cartController.clearCart);

export default cartRouter;
