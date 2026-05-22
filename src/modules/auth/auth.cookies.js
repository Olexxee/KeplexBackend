import { env } from "../../config/env.js";

import { REFRESH_TOKEN_EXPIRES_IN_MS } from "./auth.constants.js";

export const setRefreshTokenCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_EXPIRES_IN_MS,
  });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
  });
};
