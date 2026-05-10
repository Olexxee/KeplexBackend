import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
} from "../../classes/errorClasses.js";
import * as authDb from "./auth.db.js";

const signToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    },
  );
};

const sanitizeUser = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
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

  const token = signToken(user);

  return {
    user,
    token,
  };
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

  const token = signToken(user);

  return {
    user: sanitizeUser(user),
    token,
  };
};

export const getMe = async (userId) => {
  const user = await authDb.findUserById(userId);

  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  return user;
};
