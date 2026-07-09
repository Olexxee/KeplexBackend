// modules/shipping/shipping.controller.js
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as shippingService from "./shipping.service.js";
import * as cartDb from "../cart/cart.db.js";

export const createShippingConfig = asyncWrapper(async (req, res) => {
  const config = await shippingService.createShippingConfig(req.body);

  return successResponse({
    res,
    statusCode: 201,
    message: "Shipping configuration created",
    data: config,
  });
});

export const updateShippingConfig = asyncWrapper(async (req, res) => {
  const config = await shippingService.updateShippingConfig(
    req.params.id,
    req.body,
  );

  return successResponse({
    res,
    message: "Shipping configuration updated",
    data: config,
  });
});

export const getShippingConfigs = asyncWrapper(async (req, res) => {
  const configs = await shippingService.getShippingConfigs(req.query);

  return successResponse({
    res,
    message: "Shipping configurations fetched",
    data: configs,
  });
});

export const calculateCartShipping = asyncWrapper(async (req, res) => {
  const cart = await cartDb.findActiveCartByUserId(req.user.id);
  if (!cart || cart.items.length === 0) {
    return successResponse({
      res,
      data: {
        shippingCosts: null,
        message: "Cart is empty",
      },
    });
  }

  const shipping = await shippingService.calculateShippingForCart(cart.items);

  return successResponse({
    res,
    message: "Shipping calculated",
    data: shipping,
  });
});

export const calculateVariantCBM = asyncWrapper(async (req, res) => {
  const cbmData = await shippingService.calculateCBMForVariant(
    req.params.variantId,
  );

  return successResponse({
    res,
    message: "CBM calculated",
    data: cbmData,
  });
});

export const updateOrderCBM = asyncWrapper(async (req, res) => {
  const { orderId } = req.params;
  const cbmData = req.body;

  const order = await shippingService.updateOrderWithCBM(orderId, cbmData);

  return successResponse({
    res,
    message: "Order CBM updated",
    data: order,
  });
});
