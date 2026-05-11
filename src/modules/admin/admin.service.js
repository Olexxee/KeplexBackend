import bcrypt from "bcryptjs";

import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../classes/errorClasses.js";
import * as adminDb from "./admin.db.js";
import { logAudit } from "../audit/audit.service.js";

export const createStaff = async (actor, payload) => {
  const existingUser = await adminDb.findUserByEmail(payload.email);

  if (existingUser) {
    throw new ConflictError("Email is already registered");
  }

  const hashedPassword = await bcrypt.hash(payload.password, 12);

  const staff = await adminDb.createUser({
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone || null,
    password: hashedPassword,
    role: payload.role || "STAFF",
    status: "ACTIVE",
  });

  await logAudit({
    userId: actor.id,
    action: "CREATE_STAFF",
    entity: "User",
    entityId: staff.id,
    metadata: {
      email: staff.email,
      role: staff.role,
    },
  });

  return staff;
};

export const getUsers = async (filters) => {
  return adminDb.findUsers(filters);
};

export const getUserById = async (id) => {
  const user = await adminDb.findUserById(id);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
};

export const updateUserRole = async ({ actor, userId, role }) => {
  const user = await adminDb.findUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (user.role === "SUPER_ADMIN") {
    throw new BadRequestError("SUPER_ADMIN role cannot be changed");
  }

  if (role === "SUPER_ADMIN") {
    throw new BadRequestError(
      "Cannot assign SUPER_ADMIN role from this endpoint",
    );
  }

  if (actor.id === userId) {
    throw new BadRequestError("You cannot change your own role");
  }

  return adminDb.updateUserRole(userId, role);
};

export const updateUserStatus = async ({ actor, userId, status }) => {
  const user = await adminDb.findUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (user.role === "SUPER_ADMIN") {
    throw new BadRequestError("SUPER_ADMIN account cannot be suspended");
  }

  if (actor.id === userId) {
    throw new BadRequestError("You cannot change your own status");
  }

  return adminDb.updateUserStatus(userId, status);
};
