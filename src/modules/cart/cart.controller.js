// modules/cart/cart.controller.js
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as cartService from "./cart.service.js";

export const getCart = asyncWrapper(async (req, res) => {
  const cart = await cartService.getCart(req.user.id);

  return successResponse({
    res,
    message: "Cart fetched successfully",
    data: cart,
  });
});

export const getCartSummary = asyncWrapper(async (req, res) => {
  const summary = await cartService.getCartSummary(req.user.id);

  return successResponse({
    res,
    message: "Cart summary fetched successfully",
    data: summary,
  });
});

export const addItemToCart = asyncWrapper(async (req, res) => {
  const cart = await cartService.addItemToCart(req.user.id, req.body);

  return successResponse({
    res,
    statusCode: 201,
    message: "Item added to cart successfully",
    data: cart,
  });
});

export const updateCartItem = asyncWrapper(async (req, res) => {
  const cart = await cartService.updateCartItem(
    req.user.id,
    req.params.variantId,
    req.body,
  );

  return successResponse({
    res,
    message: "Cart item updated successfully",
    data: cart,
  });
});

export const removeCartItem = asyncWrapper(async (req, res) => {
  const cart = await cartService.removeCartItem(
    req.user.id,
    req.params.variantId,
  );

  return successResponse({
    res,
    message: "Cart item removed successfully",
    data: cart,
  });
});

export const clearCart = asyncWrapper(async (req, res) => {
  const cart = await cartService.clearCart(req.user.id);

  return successResponse({
    res,
    message: "Cart cleared successfully",
    data: cart,
  });
});

export const validateCart = asyncWrapper(async (req, res) => {
  const validation = await cartService.validateCartForCheckout(req.user.id);

  return successResponse({
    res,
    message: "Cart validation completed",
    data: validation,
  });
});

export const mergeCarts = asyncWrapper(async (req, res) => {
  const { sessionId } = req.body;
  const cart = await cartService.mergeCarts(req.user.id, sessionId);

  return successResponse({
    res,
    message: "Carts merged successfully",
    data: cart,
  });
});
