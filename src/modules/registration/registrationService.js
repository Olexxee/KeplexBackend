import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";
import * as registrationDb from "./registration.db.js";
import * as paymentService from "../payment/payment.service.js";
import { findTrainingProgramById } from "../training-programs/trainingProgram.db.js";
import {
  REGISTRATION_STATUS,
  REGISTRATION_STATUSES,
} from "../../constants/registrationStatus.js";
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
  const normalizedName = fullName?.trim();
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedPhone = phone?.trim();

  // 1. Verify existence and status of the training program
  const training = await findTrainingProgramById(trainingProgramId);

  if (!training) {
    throw new NotFoundError("Training program not found");
  }

  if (!training.active) {
    throw new BadRequestError("Training program is currently unavailable");
  }

  if (!training.price || Number(training.price) <= 0) {
    throw new BadRequestError("Training program price is invalid");
  }

  // 2. Prevent duplicate active registrations
  const existing = await registrationDb.findRegistrationByEmailAndProgram(
    normalizedEmail,
    trainingProgramId,
  );

  const activeStatuses = [
    REGISTRATION_STATUS.PENDING,
    REGISTRATION_STATUS.PAID,
  ];
  if (existing && activeStatuses.includes(existing.status)) {
    throw new BadRequestError(
      "This email is already registered for this program",
    );
  }

  // 3. Persist registration record using constant key
  const registration = await registrationDb.createRegistration({
    trainingProgramId,
    fullName: normalizedName,
    email: normalizedEmail,
    phone: normalizedPhone,
    amount: training.price,
    status: REGISTRATION_STATUS.PENDING,
  });

  // 4. Initialize transaction handler
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

  return formatPaginatedResponse({
    data,
    total,
    page,
    limit,
  });
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

  // Dynamic array evaluation for inbound API validation payloads
  if (!REGISTRATION_STATUSES.includes(normalizedStatus)) {
    throw new BadRequestError("Invalid registration status");
  }

  return registrationDb.updateRegistrationById(id, {
    status: normalizedStatus,
  });
};
