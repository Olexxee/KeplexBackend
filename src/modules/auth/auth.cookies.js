import { env } from "../../config/env.js";

import {
  ACCESS_TOKEN_EXPIRES_IN_MS,
  REFRESH_TOKEN_EXPIRES_IN_MS,
} from "./auth.constants.js";

export const setAccessTokenCookie = (res, token) => {
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    maxAge: ACCESS_TOKEN_EXPIRES_IN_MS,
  });
};

export const clearAccessTokenCookie = (res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
  });
};

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
