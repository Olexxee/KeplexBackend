import { ValidationError } from "../classes/errorClasses.js";

export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      console.error("❌ VALIDATION ERROR");
      console.error("Source:", source);
      console.error("Received:", req[source]);
      console.error("Details:", error.details);

      return next(
        new ValidationError("Validation failed"),
      );
    }

    req.validated = req.validated || {};
    req.validated[source] = value;

    next();
  };
};

export const validateBody = (schema) => validate(schema, "body");
export const validateParams = (schema) => validate(schema, "params");
export const validateQuery = (schema) => validate(schema, "query");
