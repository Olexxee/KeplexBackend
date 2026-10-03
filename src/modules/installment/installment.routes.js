import express from "express";
import * as controller from "./installment.controller.js";
import {
  createInstallmentPlanSchema,
  initializeInstallmentPaymentSchema,
} from "./installment.validation.js";
import {authMiddleware} from "../../middlewares/authMiddleware.js";
import {validateBody} from "../../middlewares/validateMiddleware.js";


const installmentRouter = express.Router();

installmentRouter.use(authMiddleware);

installmentRouter.post(
  "/plans",
  validateBody(createInstallmentPlanSchema),
  controller.createPlan,
);

installmentRouter.get(
  "/plans",
  controller.getPlans,
);

installmentRouter.get(
  "/plans/:planId",
  controller.getPlan,
);

installmentRouter.post(
  "/plans/:planId/pay",
  validateBody(initializeInstallmentPaymentSchema),
  controller.initializePayment,
);

export default installmentRouter;
