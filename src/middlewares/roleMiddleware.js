import { ForbiddenError } from "../classes/errorClasses.js";

export const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError("Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError("You do not have permission to perform this action"),
      );
    }

    next();
  };
};
