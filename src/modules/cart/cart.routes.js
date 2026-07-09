// modules/cart/cart.routes.js
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
  cartVariantIdSchema,
  mergeCartsSchema,
} from "./cart.validation.js";

const cartRouter = Router();

cartRouter.use(authMiddleware);

// Get cart
cartRouter.get("/", cartController.getCart);

// Get cart summary with shipping/tax estimates
cartRouter.get("/summary", cartController.getCartSummary);

// Validate cart for checkout
cartRouter.get("/validate", cartController.validateCart);

// Add item to cart
cartRouter.post(
  "/items",
  validateBody(addCartItemSchema),
  cartController.addItemToCart,
);

// Update cart item
cartRouter.patch(
  "/items/:variantId",
  validateParams(cartVariantIdSchema),
  validateBody(updateCartItemSchema),
  cartController.updateCartItem,
);

// Remove cart item
cartRouter.delete(
  "/items/:variantId",
  validateParams(cartVariantIdSchema),
  cartController.removeCartItem,
);

// Clear cart
cartRouter.delete("/clear", cartController.clearCart);

// Merge guest cart with user cart
cartRouter.post(
  "/merge",
  validateBody(mergeCartsSchema),
  cartController.mergeCarts,
);

export default cartRouter;
