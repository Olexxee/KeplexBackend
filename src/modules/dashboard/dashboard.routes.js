import { Router } from "express";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import * as dashboardController from "./dashboard.controller.js";

const dashboardRouter = Router();

dashboardRouter.use(authMiddleware);
dashboardRouter.use(roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"));

dashboardRouter.get("/overview", dashboardController.getDashboardOverview);

export default dashboardRouter;
