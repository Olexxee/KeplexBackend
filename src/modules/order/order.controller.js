import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as orderService from "./order.service.js";

export const checkout = asyncWrapper(async (req, res) => {
  const order = await orderService.checkout(req.user.id, req.body);

  return successResponse({
    res,
    statusCode: 201,
    message: "Checkout completed successfully",
    data: order,
  });
});

export const getMyOrders = asyncWrapper(async (req, res) => {
  const orders = await orderService.getMyOrders(req.user.id);

  return successResponse({
    res,
    message: "Orders fetched successfully",
    data: orders,
  });
});

export const getAllOrders = asyncWrapper(async (req, res) => {
  const orders = await orderService.getAllOrders(req.query);

  return successResponse({
    res,
    message: "Orders fetched successfully",
    data: orders,
  });
});

export const getOrderById = asyncWrapper(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id, req.user);

  return successResponse({
    res,
    message: "Order fetched successfully",
    data: order,
  });
});

export const updateOrderStatus = asyncWrapper(async (req, res) => {
  const order = await orderService.updateOrderStatus(
    req.params.id,
    req.body.status,
  );

  return successResponse({
    res,
    message: "Order status updated successfully",
    data: order,
  });
});
