import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as orderService from "./order.service.js";

export const checkout = asyncWrapper(async (req, res) => {
  const order = await orderService.checkout({
    userId: req.user.id,
    payload: req.body,
  });

  return successResponse({
    res,
    statusCode: 201,
    message: "Checkout completed successfully",
    data: order,
  });
});

export const getMyOrders = asyncWrapper(async (req, res) => {
  const orders = await orderService.getMyOrders(req.user.id, req.query);
  return successResponse({
    res,
    message: "Orders fetched successfully",
    data: orders.data,
    meta: orders.meta,
  });
});

export const getOrderTimeline = asyncWrapper(async (req, res) => {
  const timeline = await orderService.getOrderTimeline(req.params.id, req.user);
  return successResponse({
    res,
    message: "Order timeline fetched successfully",
    data: timeline,
  });
});

export const getOrderByOrderNumber = asyncWrapper(async (req, res) => {
  const order = await orderService.getOrderByOrderNumber(
    req.params.orderNumber,
    req.user,
  );
  return successResponse({
    res,
    message: "Order fetched successfully",
    data: order,
  });
});

export const getAllOrders = asyncWrapper(async (req, res) => {
  const orders = await orderService.getAllOrders(req.query);
  return successResponse({
    res,
    message: "Orders fetched successfully",
    data: orders.data,
    meta: orders.meta,
  });
});

export const getOrderMetrics = asyncWrapper(async (req, res) => {
  const metrics = await orderService.getOrderMetrics();
  return successResponse({
    res,
    message: "Order metrics fetched successfully",
    data: metrics,
  });
});

export const getOrdersByFulfillmentType = asyncWrapper(async (req, res) => {
  const orders = await orderService.getOrdersByFulfillmentType(
    req.params.fulfillmentType,
  );
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
    req.user.id,
  );
  return successResponse({
    res,
    message: "Order status updated successfully",
    data: order,
  });
});

export const updateOrderCBM = asyncWrapper(async (req, res) => {
  const order = await orderService.updateOrderCBM(
    req.params.id,
    req.body,
    req.user.id,
  );
  return successResponse({
    res,
    message: "Order CBM updated successfully",
    data: order,
  });
});
