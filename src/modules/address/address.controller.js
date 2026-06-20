import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as service from "./address.service.js";

export const getMyAddresses = asyncWrapper(async (req, res) => {
  const data = await service.getMyAddresses(req.user.id);

  return successResponse({
    res,
    data,
  });
});

export const create = asyncWrapper(async (req, res) => {
  const data = await service.create(req.user.id, req.body);

  return successResponse({
    res,
    statusCode: 201,
    data,
  });
});

export const update = asyncWrapper(async (req, res) => {
  const data = await service.update(req.user.id, req.params.id, req.body);

  return successResponse({ res, data });
});

export const remove = asyncWrapper(async (req, res) => {
  await service.remove(req.user.id, req.params.id);

  return successResponse({
    res,
    message: "Deleted",
  });
});

export const setDefault = asyncWrapper(async (req, res) => {
  const data = await service.setDefault(req.user.id, req.params.id);

  return successResponse({
    res,
    data,
  });
});

export const updateMe = asyncWrapper(async (req, res) => {
  const data = await authService.updateMe(req.user.id, req.body);

  return successResponse({
    res,
    data,
  });
});
