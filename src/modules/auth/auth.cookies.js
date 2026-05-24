import { env } from "../../config/env.js";
import {
  ACCESS_TOKEN_EXPIRES_IN_MS,
  REFRESH_TOKEN_EXPIRES_IN_MS,
} from "./auth.constants.js";

const cookieOptions = (env) => ({
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: env.nodeEnv === "production" ? "none" : "lax",
});

export const setAccessTokenCookie = (res, token) => {
  res.cookie("accessToken", token, {
    ...cookieOptions(env),
    maxAge: ACCESS_TOKEN_EXPIRES_IN_MS,
  });
};

export const clearAccessTokenCookie = (res) => {
  res.clearCookie("accessToken", cookieOptions(env));
};

export const setRefreshTokenCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    ...cookieOptions(env),
    maxAge: REFRESH_TOKEN_EXPIRES_IN_MS,
  });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie("refreshToken", cookieOptions(env));
};
