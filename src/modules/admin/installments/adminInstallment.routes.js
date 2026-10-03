import express from "express";
import * as controller from "./adminInstallment.controller.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../../middlewares/roleMiddleware.js";


const adminInstallmentRouter = express.Router();

adminInstallmentRouter.use(authMiddleware);

adminInstallmentRouter.use(roleMiddleware("SUPER_ADMIN", "ADMIN"));

adminInstallmentRouter.get("/", controller.getPlans);

adminInstallmentRouter.get("/stats", controller.getStats);

adminInstallmentRouter.get("/payments/:paymentId", controller.getPayment);

adminInstallmentRouter.get("/:planId", controller.getPlan);

adminInstallmentRouter.get("/:planId/payments", controller.getPlanPayments);

adminInstallmentRouter.post("/:planId/cancel", controller.cancelPlan);

export default adminInstallmentRouter;