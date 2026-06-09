import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { UnauthorizedError } from "../classes/errorClasses.js";

import * as authDb from "../modules/auth/auth.db.js";

export const authMiddleware = async (req, res, next) => {
  try {
    console.log("Cookies:", req.cookies);

    const token = req.cookies?.accessToken;

    console.log("Access token exists:", !!token);

    if (!token) {
      throw new UnauthorizedError("Authentication token is required");
    }

    const decoded = jwt.verify(token, env.jwtSecret);

    console.log("Decoded:", decoded);

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
    console.error("AUTH ERROR:", error);
    next(error);
  }
};