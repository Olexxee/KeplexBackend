import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";

import {
  getAllConfigs,
  getConfigByKey,
  updateConfig,
} from "./businessConfig.controller.js";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware("SUPER_ADMIN", "ADMIN"));

router.get("/", getAllConfigs);
router.get("/:key", getConfigByKey);
router.patch("/:key", updateConfig);

export default router;
