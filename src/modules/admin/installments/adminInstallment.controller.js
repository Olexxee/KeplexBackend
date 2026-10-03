import { asyncWrapper } from "../../../lib/asyncWrapper.js";
import { successResponse } from "../../../lib/response.js";

import * as adminInstallmentService from "./adminInstallment.service.js";

export const getPlans = asyncWrapper(async (req, res) => {
  const result = await adminInstallmentService.getPlans({
    status: req.query.status,
    search: req.query.search,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });

  return successResponse({
    res,
    data: result.data,
    meta: result.meta,
  });
});

export const getStats = asyncWrapper(async (req, res) => {
  const stats = await adminInstallmentService.getStats();

  return successResponse({
    res,
    data: stats,
  });
});

export const getPlan = asyncWrapper(async (req, res) => {
  const plan = await adminInstallmentService.getPlan(req.params.planId);

  return successResponse({
    res,
    data: plan,
  });
});

export const getPlanPayments = asyncWrapper(async (req, res) => {
  const payments = await adminInstallmentService.getPlanPayments(
    req.params.planId,
  );

  return successResponse({
    res,
    data: payments,
  });
});

export const getPayment = asyncWrapper(async (req, res) => {
  const payment = await adminInstallmentService.getPayment(
    req.params.paymentId,
  );

  return successResponse({
    res,
    data: payment,
  });
});

export const cancelPlan = asyncWrapper(async (req, res) => {
  const plan = await adminInstallmentService.cancelPlan(
    req.params.planId,
  );

  return successResponse({
    res,
    data: plan,
    message: "FlexPay plan cancelled successfully",
  });
});