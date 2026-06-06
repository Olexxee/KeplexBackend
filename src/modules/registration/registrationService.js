import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";
import * as registrationDb from "./registration.db.js";
import * as paymentService from "../payment/payment.service.js";
import { findTrainingProgramById } from "../training-programs/trainingProgram.db.js";
import {
  getPaginationParams,
  formatPaginatedResponse,
} from "../../lib/pagination.js";

const normalizeStatus = (status) =>
  status ? String(status).trim().toUpperCase() : null;

export const createRegistration = async ({
  trainingProgramId,
  fullName,
  email,
  phone,
}) => {
  const training = await findTrainingProgramById(trainingProgramId);

  if (!training) {
    throw new NotFoundError("Training program not found");
  }

  if (!training.active) {
    throw new BadRequestError("Training program is currently unavailable");
  }

  // prevent duplicate registrations for the same email + program
  const existing = await registrationDb.findRegistrationByEmailAndProgram(
    email.trim().toLowerCase(),
    trainingProgramId,
  );

  if (existing) {
    throw new BadRequestError(
      "This email is already registered for this program",
    );
  }

  const registration = await registrationDb.createRegistration({
    trainingProgramId,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    status: "PENDING",
  });

  // immediately initialize payment and return authorization URL
  const payment = await paymentService.initializeRegistrationPayment({
    registrationId: registration.id,
  });

  return {
    registration,
    payment,
  };
};

export const getRegistrations = async (query) => {
  const { page = 1, limit = 20, status, trainingProgramId } = query;
  const { skip, take } = getPaginationParams(page, limit);

  const [data, total] = await registrationDb.listRegistrations({
    status: normalizeStatus(status),
    trainingProgramId,
    skip,
    take,
  });

  return formatPaginatedResponse({ data, total, page, limit });
};

export const getRegistrationById = async (id) => {
  const registration = await registrationDb.findRegistrationById(id);

  if (!registration) {
    throw new NotFoundError("Registration not found");
  }

  return registration;
};

export const getRegistrationStats = async () => {
  return registrationDb.getRegistrationStats();
};

export const updateRegistrationStatus = async ({ id, status }) => {
  const registration = await registrationDb.findRegistrationById(id);

  if (!registration) {
    throw new NotFoundError("Registration not found");
  }

  const normalizedStatus = normalizeStatus(status);

  return registrationDb.updateRegistrationById(id, {
    status: normalizedStatus,
  });
};
