import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as registrationService from "./registrationService.js";

export const createRegistration = asyncWrapper(async (req, res) => {
  const result = await registrationService.createRegistration(req.body);
  return successResponse({
    res,
    statusCode: 201,
    message: "Registration created successfully",
    data: result,
  });
});

export const getRegistrations = asyncWrapper(async (req, res) => {
  const result = await registrationService.getRegistrations(req.query);
  return successResponse({
    res,
    message: "Registrations fetched successfully",
    data: result,
  });
});

export const getRegistrationById = asyncWrapper(async (req, res) => {
  const registration = await registrationService.getRegistrationById(
    req.params.id,
  );
  return successResponse({
    res,
    message: "Registration fetched successfully",
    data: registration,
  });
});

export const getRegistrationStats = asyncWrapper(async (_req, res) => {
  const stats = await registrationService.getRegistrationStats();
  return successResponse({
    res,
    message: "Registration stats fetched successfully",
    data: stats,
  });
});

export const updateRegistrationStatus = asyncWrapper(async (req, res) => {
  const registration = await registrationService.updateRegistrationStatus({
    id: req.params.id,
    status: req.body.status,
  });
  return successResponse({
    res,
    message: "Registration status updated successfully",
    data: registration,
  });
});
