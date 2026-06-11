import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import {roleMiddeware, roleMiddleware} from "../../../middlewares/roleMiddleware.js"
import { sendPromoEmail } from "./promo.controller.js";

const router = Router();

router.use(authMiddleware)

router.post(
  "/promo",
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  sendPromoEmail,
);

export default router;
