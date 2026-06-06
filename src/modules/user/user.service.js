import bcrypt from "bcryptjs";

import { BadRequestError } from "../../classes/errorClasses.js";
import * as userDb from "./user.db.js";

export const updateProfile = async (userId, payload) => {
  return userDb.updateUser(userId, {
    fullName: payload.fullName,
    phone: payload.phone,
  });
};

