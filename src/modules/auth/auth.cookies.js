import {
  ACCESS_TOKEN_EXPIRES_IN_MS,
  REFRESH_TOKEN_EXPIRES_IN_MS,
} from "./auth.constants.js";

const isProduction =
  process.env.RENDER || process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: Boolean(isProduction),
  sameSite: "none",
  path: "/",
};

console.log({
  NODE_ENV: process.env.NODE_ENV,
  RENDER: process.env.RENDER,
  isProduction,
  cookieOptions,
});


export const setAccessTokenCookie = (res, token) => {
  console.log("SETTING ACCESS COOKIE");
  console.log("Access token length:", token.length);

  res.cookie("accessToken", token, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_EXPIRES_IN_MS,
  });
};

export const clearAccessTokenCookie = (res) => {
  res.clearCookie("accessToken", cookieOptions);
};

export const setRefreshTokenCookie = (res, token) => {
  console.log("SETTING REFRESH COOKIE");
  console.log("Refresh token length:", token.length);

  res.cookie("refreshToken", token, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_EXPIRES_IN_MS,
  });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie("refreshToken", cookieOptions);
};