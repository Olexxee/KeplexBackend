import { Router } from "express";
import { validateBody } from "../../middlewares/validateMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import * as organisationController from "./organisation.controller.js";
import { upsertOrganisationSchema } from "./organisation.validation.js";

const organisationRouter = Router();

organisationRouter.get("/", organisationController.getOrganisation);

organisationRouter.put(
  "/",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  validateBody(upsertOrganisationSchema),
  organisationController.upsertOrganisation,
);

export default organisationRouter;
