import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as adminService from "./admin.service.js";

export const createStaff = asyncWrapper(async (req, res) => {
    const user = await adminService.createStaff(req.user, req.body);  

  return successResponse({
    res,
    statusCode: 201,
    message: "Staff account created successfully",
    data: user,
  });
});

export const getUsers = asyncWrapper(async (req, res) => {
  const users = await adminService.getUsers(req.query);

  return successResponse({
    res,
    message: "Users fetched successfully",
    data: users,
  });
});

export const getUserById = asyncWrapper(async (req, res) => {
  const user = await adminService.getUserById(req.params.id);

  return successResponse({
    res,
    message: "User fetched successfully",
    data: user,
  });
});

export const updateUserRole = asyncWrapper(async (req, res) => {
  const user = await adminService.updateUserRole({
    actor: req.user,
    userId: req.params.id,
    role: req.body.role,
  });

  return successResponse({
    res,
    message: "User role updated successfully",
    data: user,
  });
});

export const updateUserStatus = asyncWrapper(async (req, res) => {
  const user = await adminService.updateUserStatus({
    actor: req.user,
    userId: req.params.id,
    status: req.body.status,
  });

  return successResponse({
    res,
    message: "User status updated successfully",
    data: user,
  });
});
