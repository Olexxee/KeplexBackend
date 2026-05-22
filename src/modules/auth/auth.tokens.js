import jwt from "jsonwebtoken";
import crypto from "crypto";

import { env } from "../../config/env.js";

import { ACCESS_TOKEN_EXPIRES_IN } from "./auth.constants.js";

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    env.jwtSecret,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    },
  );
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

export const hashRefreshToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
