import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as sourcingService from "./sourcing.service.js";
import {
  toSourcingRequest,
  toSourcingRequestList,
  toSourcingResponse,
  toAdminSourcingRequest,
} from "./sourcing.mapper.js";

/* ------------------------------------------------------------------ */
/* Customer                                                           */
/* ------------------------------------------------------------------ */

export const createSourcingRequest = asyncWrapper(async (req, res) => {
  const result = await sourcingService.createSourcingRequest(
    req.user.id,
    req.body,
  );

  if (result.type === "CATALOG_MATCH") {
    return successResponse({
      res,
      data: {
        type: result.type,
        analysis: result.analysis,
        match: result.match,
      },
      message: "Matching product found",
      statusCode: 200,
    });
  }

  return successResponse({
    res,
    data: {
      type: result.type,
      analysis: result.analysis,
      request: toSourcingRequest(result.request),
    },
    message: "Sourcing request created",
    statusCode: 201,
  });
});

export const getMySourcingRequests = asyncWrapper(async (req, res) => {
  const result = await sourcingService.getUserSourcingRequests(
    req.user.id,
    req.query,
  );

  return successResponse({
    res,
    data: toSourcingRequestList(result),
    message: "Sourcing requests retrieved",
  });
});

export const getMySourcingRequest = asyncWrapper(async (req, res) => {
  const request = await sourcingService.getUserSourcingRequest(
    req.user.id,
    req.params.id,
  );

  return successResponse({
    res,
    data: toSourcingRequest(request),
    message: "Sourcing request retrieved",
  });
});

/* ------------------------------------------------------------------ */
/* Admin                                                              */
/* ------------------------------------------------------------------ */

export const getAdminSourcingRequest = asyncWrapper(async (req, res) => {
  const request = await sourcingService.getAdminSourcingRequest(req.params.id);

  return successResponse({
    res,
    data: toAdminSourcingRequest(request),
    message: "Sourcing request retrieved successfully",
  });
});

export const getAdminSourcingRequests = asyncWrapper(async (req, res) => {
  const result = await sourcingService.getAdminSourcingRequests(req.query);

  return successResponse({
    res,
    data: toSourcingRequestList(result),
    message: "Sourcing requests retrieved",
  });
});

export const updateSourcingRequestStatus = asyncWrapper(async (req, res) => {
  const request = await sourcingService.updateSourcingRequestStatus(
    req.params.id,
    req.body.status,
  );

  return successResponse({
    res,
    data: toSourcingRequest(request),
    message: "Sourcing request status updated",
  });
});

export const respondToSourcingRequest = asyncWrapper(async (req, res) => {
  const response = await sourcingService.respondToSourcingRequest(
    req.params.id,
    req.body,
  );

  return successResponse({
    res,
    data: toSourcingResponse(response),
    message: "Sourcing response created",
    statusCode: 201,
  });
});

export const updateSourcingResponseStatus = asyncWrapper(async (req, res) => {
  const response = await sourcingService.updateSourcingResponseStatus(
    req.params.id,
    req.body.status,
  );

  return successResponse({
    res,
    data: toSourcingResponse(response),
    message: "Sourcing response status updated",
  });
});
