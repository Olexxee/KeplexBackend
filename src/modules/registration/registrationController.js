import { asyncWrapper } from "../../lib/asyncWrapper.js";
import * as registrationService from "./registrationService.js";

export const initializeRegistration = asyncWrapper(async (req, res) => {
  const result = await registrationService.createRegistrationPayment(req.body);

  return res.status(201).json({
    success: true,
    message: "Registration payment initialized",
    data: result,
  });
});

export const verifyRegistration = asyncWrapper(async (req, res) => {
  const result = await registrationService.verifyRegistrationPayment(
    req.params.reference,
  );

  return res.status(200).json({
    success: true,
    message: "Registration payment verified",
    data: result,
  });
});

export const getRegistrations = asyncWrapper(async (req, res) => {
  const result = await registrationService.getRegistrations(req.query);

  return res.status(200).json({
    success: true,
    message: "Registrations fetched successfully",
    data: result.items,
    meta: result.meta,
  });
});

export const getRegistrationById = asyncWrapper(async (req, res) => {
  const result = await registrationService.getRegistrationById(req.params.id);

  return res.status(200).json({
    success: true,
    message: "Registration fetched successfully",
    data: result,
  });
});

export const getRegistrationStats = asyncWrapper(async (req, res) => {
  const result = await registrationService.getRegistrationStats();

  return res.status(200).json({
    success: true,
    message: "Registration stats fetched successfully",
    data: result,
  });
});

export const updateRegistrationStatus = asyncWrapper(async (req, res) => {
  const result = await registrationService.updateRegistrationStatus({
    id: req.params.id,
    status: req.body.status,
  });

  return res.status(200).json({
    success: true,
    message: "Registration status updated successfully",
    data: result,
  });
});
