import { Router } from "express";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import * as auditController from "./audit.controller.js";

const auditRouter = Router();

auditRouter.use(authMiddleware);
auditRouter.use(roleMiddleware("SUPER_ADMIN", "ADMIN"));

auditRouter.get("/", auditController.getAuditLogs);

export default auditRouter;
