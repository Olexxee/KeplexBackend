import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as authService from "./auth.service.js";

export const register = asyncWrapper(async (req, res) => {
  const result = await authService.register(req.body);

  return successResponse({
    res,
    statusCode: 201,
    message: "Account created successfully",
    data: result,
  });
});

export const login = asyncWrapper(async (req, res) => {
  const result = await authService.login(req.body);

  return successResponse({
    res,
    message: "Login successful",
    data: result,
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
