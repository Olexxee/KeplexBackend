import { asyncWrapper } from "../../lib/asyncWrapper.js";

import { successResponse } from "../../lib/response.js";

import * as authService from "./auth.service.js";

import {
  setAccessTokenCookie,
  clearAccessTokenCookie,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "./auth.cookies.js";

export const register = asyncWrapper(async (req, res) => {
  const result = await authService.register(req.body);

  setAccessTokenCookie(res, result.accessToken);

  setRefreshTokenCookie(res, result.refreshToken);

  return successResponse({
    res,
    statusCode: 201,
    message: "Account created successfully",
    data: {
      user: result.user,
    },
  });
});

export const login = asyncWrapper(async (req, res) => {
  const result = await authService.login(req.body);

  setAccessTokenCookie(res, result.accessToken);

  setRefreshTokenCookie(res, result.refreshToken);

  return successResponse({
    res,
    message: "Login successful",
    data: {
      user: result.user,
    },
  });
});

export const refreshSession = asyncWrapper(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  const result = await authService.refreshSession(refreshToken);

  // issue fresh access token cookie
  setAccessTokenCookie(res, result.accessToken);

  return successResponse({
    res,
    message: "Session refreshed",
    data: {
      user: result.user,
    },
  });
});

export const logout = asyncWrapper(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  await authService.logout(refreshToken);

  clearAccessTokenCookie(res);

  clearRefreshTokenCookie(res);

  return successResponse({
    res,
    message: "Logout successful",
  });
});

export const getMe = asyncWrapper(async (req, res) => {
  const user = await authService.getMe(req.user.id);

  return successResponse({
    res,
    message: "Current user fetched successfully",
    data: user,
  });
});

export const updateMe = asyncWrapper(async (req, res) => {
  const data = await authService.updateMe(req.user.id, req.body);

  return successResponse({
    res,
    message: "User updated successfully",
    data,
  });
});
