import bcrypt from "bcryptjs";

import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
} from "../../classes/errorClasses.js";

import * as authDb from "./auth.db.js";

import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "./auth.tokens.js";

import { REFRESH_TOKEN_EXPIRES_IN_MS } from "./auth.constants.js";

const sanitizeUser = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

const buildAuthResponse = async (user) => {
  const accessToken = generateAccessToken(user);

  const refreshToken = generateRefreshToken();

  await authDb.createRefreshToken({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS),
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

export const register = async ({ fullName, email, phone, password }) => {
  const existingUser = await authDb.findUserByEmailWithPassword(email);

  if (existingUser) {
    throw new ConflictError("Email is already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await authDb.createUser({
    fullName,
    email,
    phone: phone || null,
    password: hashedPassword,
  });

  return buildAuthResponse(user);
};

export const login = async ({ email, password }) => {
  const user = await authDb.findUserByEmailWithPassword(email);

  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    throw new BadRequestError("Account is not active");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid email or password");
  }

  return buildAuthResponse(user);
};

export const changePassword = async ({
  user,
  currentPassword,
  newPassword,
}) => {
  // re-fetch full user record to get hashed password
  const fullUser = await authDb.findUserByEmailWithPassword(user.email);

  if (!fullUser) {
    throw new UnauthorizedError("User not found");
  }

  const valid = await bcrypt.compare(currentPassword, fullUser.password);

  if (!valid) {
    throw new BadRequestError("Current password is incorrect");
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await authDb.updateUser(user.id, { password: hashed });

  // revoke all refresh tokens to force re-login on other devices
  await authDb.revokeAllUserRefreshTokens(user.id);

  return true;
};

export const refreshSession = async (refreshToken) => {
  if (!refreshToken) {
    throw new UnauthorizedError("Refresh token missing");
  }

  const hashedToken = hashRefreshToken(refreshToken);

  const tokenRecord = await authDb.findRefreshToken(hashedToken);

  if (!tokenRecord) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token expired");
  }

  const accessToken = generateAccessToken(tokenRecord.user);

  return {
    accessToken,
    user: sanitizeUser(tokenRecord.user),
  };
};

export const updateMe = async (userId, payload) => {
  return authDb.updateUser(userId, payload);
};



export const logout = async (refreshToken) => {
  if (!refreshToken) return;

  const hashedToken = hashRefreshToken(refreshToken);

  const tokenRecord = await authDb.findRefreshToken(hashedToken);

  if (!tokenRecord) return;

  await authDb.revokeRefreshToken(tokenRecord.id);
};

export const getMe = async (userId) => {
  const user = await authDb.findUserById(userId);

  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  return user;
};
