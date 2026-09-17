import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";

import * as fulfillmentService from "./fulfillment.service.js";

// ============================================================
// FULFILLMENTS
// ============================================================

export const getFulfillments = asyncWrapper(async (req, res) => {
  const result = await fulfillmentService.getFulfillments(req.query);

  return successResponse({
    res,
    message: "Fulfillments fetched successfully",
    data: result.fulfillments,
    meta: result.pagination,
  });
});

export const getFulfillmentById = asyncWrapper(async (req, res) => {
  const fulfillment = await fulfillmentService.getFulfillmentById(
    req.params.id,
  );

  return successResponse({
    res,
    message: "Fulfillment fetched successfully",
    data: fulfillment,
  });
});

export const getFulfillmentsByOrder = asyncWrapper(async (req, res) => {
  const fulfillments = await fulfillmentService.getFulfillmentsByOrder(
    req.params.orderId,
  );

  return successResponse({
    res,
    message: "Fulfillments fetched successfully",
    data: fulfillments,
  });
});

export const updateFulfillmentStatus = asyncWrapper(async (req, res) => {
  const fulfillment = await fulfillmentService.updateFulfillmentStatus(
    req.params.id,
    req.body.status,
    req.user.id,
  );

  return successResponse({
    res,
    message: "Fulfillment status updated successfully",
    data: fulfillment,
  });
});

export const updateFulfillmentTracking = asyncWrapper(async (req, res) => {
  const fulfillment = await fulfillmentService.updateFulfillmentTracking(
    req.params.id,
    req.body,
  );

  return successResponse({
    res,
    message: "Fulfillment tracking updated successfully",
    data: fulfillment,
  });
});

export const deleteFulfillment = asyncWrapper(async (req, res) => {
  await fulfillmentService.deleteFulfillment(req.params.id);

  return successResponse({
    res,
    message: "Fulfillment deleted successfully",
    data: null,
  });
});

export const createFulfillmentsForOrder = asyncWrapper(async (req, res) => {
  const fulfillments = await fulfillmentService.generateFulfillmentsForOrder(
    req.params.orderId,
  );

  return successResponse({
    res,
    statusCode: 201,
    message: "Fulfillments generated successfully",
    data: fulfillments,
  });
});
