import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { UnauthorizedError } from "../classes/errorClasses.js";
import * as authDb from "../modules/auth/auth.db.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.cookies?.token;

    if (!token) {
      throw new UnauthorizedError("Authentication token is required");
    }

    const decoded = jwt.verify(token, env.jwtSecret);

    const user = await authDb.findUserById(decoded.userId);

    if (!user) {
      throw new UnauthorizedError("Invalid authentication token");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedError("Account is not active");
    }

    req.user = user;

    next();
  } catch (error) {
    next(new UnauthorizedError("Invalid or expired authentication token"));
  }
};
