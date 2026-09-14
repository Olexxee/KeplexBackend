import {
  ACCESS_TOKEN_EXPIRES_IN_MS,
  REFRESH_TOKEN_EXPIRES_IN_MS,
} from "./auth.constants.js";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

export const setAccessTokenCookie = (res, token) => {
  res.cookie("accessToken", token, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_EXPIRES_IN_MS,
  });
};

export const clearAccessTokenCookie = (res) => {
  res.clearCookie("accessToken", cookieOptions);
};

export const setRefreshTokenCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_EXPIRES_IN_MS,
  });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie("refreshToken", cookieOptions);
};