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
    req.params.itemId,
    req.body,
  );

  return successResponse({
    res,
    message: "Cart item updated successfully",
    data: cart,
  });
});

export const removeCartItem = asyncWrapper(async (req, res) => {
  const cart = await cartService.removeCartItem(req.user.id, req.params.itemId);

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
