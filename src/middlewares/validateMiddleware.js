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

      return next(new ValidationError("Validation failed"));
    }

    // Write the validated/converted value back onto req[source] itself —
    // controllers and services read req.body/req.params/req.query directly,
    // so this is what actually applies Joi's type coercion (e.g. "true" -> true,
    // "1" -> 1) to what downstream code sees.
    //
    // req.query is a getter-only property in Express 5 (no setter), so
    // reassigning it throws "Cannot set property query of #<IncomingMessage>
    // which has only a getter". body/params are plain writable properties,
    // so only query needs in-place mutation instead of reassignment.
    if (source === "query") {
      Object.keys(req.query).forEach((key) => delete req.query[key]);
      Object.assign(req.query, value);
    } else {
      req[source] = value;
    }

    req.validated = req.validated || {};
    req.validated[source] = value;

    next();
  };
};

export const validateBody = (schema) => validate(schema, "body");
export const validateParams = (schema) => validate(schema, "params");
export const validateQuery = (schema) => validate(schema, "query");
