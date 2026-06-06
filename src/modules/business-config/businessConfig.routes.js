import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";

import {
  getAllConfigs,
  getConfigByKey,
  updateConfig,
} from "./businessConfig.controller.js";

const configRouter = Router();

configRouter.use(authMiddleware);
configRouter.use(roleMiddleware("SUPER_ADMIN", "ADMIN"));
configRouter.get("/", getAllConfigs);
configRouter.get("/:key", getConfigByKey);
configRouter.patch("/:key", updateConfig);



export default configRouter;