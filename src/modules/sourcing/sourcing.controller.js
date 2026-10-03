import {asyncWrapper} from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as sourcingService from "./sourcing.service.js";
import {
  toSourcingRequest,
  toSourcingRequestList,
  toSourcingResponse,
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
    return successResponse(
      res,
      {
        type: result.type,
        analysis: result.analysis,
        match: result.match,
      },
      "Matching product found",
      201,
    );
  }

  return successResponse(
    res,
    {
      type: result.type,
      analysis: result.analysis,
      request: toSourcingRequest(result.request),
    },
    "Sourcing request created",
    201,
  );
});

export const getMySourcingRequests = asyncWrapper(async (req, res) => {
  const result = await sourcingService.getUserSourcingRequests(
    req.user.id,
    req.query,
  );

  return successResponse(
    res,
    toSourcingRequestList(result),
    "Sourcing requests retrieved",
  );
});

export const getMySourcingRequest = asyncWrapper(async (req, res) => {
  const request = await sourcingService.getUserSourcingRequest(
    req.user.id,
    req.params.id,
  );

  return successResponse(
    res,
    toSourcingRequest(request),
    "Sourcing request retrieved",
  );
});

/* ------------------------------------------------------------------ */
/* Admin                                                              */
/* ------------------------------------------------------------------ */

export const getAdminSourcingRequest = asyncWrapper(async (req, res) => {
  const request = await sourcingService.getAdminSourcingRequest(req.params.id);

  return successResponse(
    res,
    toAdminSourcingRequest(request),
    "Sourcing request retrieved successfully",
  );
});

export const findAdminSourcingRequestById = async (id, tx) => {
  return db(tx).sourcingRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      responses: {
        orderBy: {
          createdAt: "desc",
        },
        include: responseInclude,
      },
    },
  });
};

export const getAdminSourcingRequests = asyncWrapper(async (req, res) => {
  const result = await sourcingService.getAdminSourcingRequests(req.query);

  return successResponse(
    res,
    toSourcingRequestList(result),
    "Sourcing requests retrieved",
  );
});



export const updateSourcingRequestStatus = asyncWrapper(async (req, res) => {
  const request = await sourcingService.updateSourcingRequestStatus(
    req.params.id,
    req.body.status,
  );

  return successResponse(
    res,
    toSourcingRequest(request),
    "Sourcing request status updated",
  );
});

export const respondToSourcingRequest = asyncWrapper(async (req, res) => {
  const response = await sourcingService.respondToSourcingRequest(
    req.params.id,
    req.body,
  );

  return successResponse(
    res,
    toSourcingResponse(response),
    "Sourcing response created",
    201,
  );
});

export const updateSourcingResponseStatus = asyncWrapper(async (req, res) => {
  const response = await sourcingService.updateSourcingResponseStatus(
    req.params.id,
    req.body.status,
  );

  return successResponse(
    res,
    toSourcingResponse(response),
    "Sourcing response status updated",
  );
});
