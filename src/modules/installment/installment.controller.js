import * as installmentService from "./installment.service.js";

export const createPlan = async (req, res) => {
  const plan = await installmentService.createPlan({
    userId: req.user.id,

    payload: req.body,
  });

  res.status(201).json({
    success: true,

    data: plan,
  });
};

export const getPlans = async (req, res) => {
  const plans = await installmentService.getPlans(req.user.id);

  res.json({
    success: true,

    data: plans,
  });
};

export const getPlan = async (req, res) => {
  const plan = await installmentService.getPlan({
    userId: req.user.id,

    planId: req.params.planId,
  });

  res.json({
    success: true,

    data: plan,
  });
};

export const initializePayment = async (req, res) => {
  const payment = await installmentService.initializePayment({
    userId: req.user.id,
    planId: req.params.planId,
    amount: req.body.amount,
  });

  res.status(201).json({
    success: true,

    data: payment,
  });
};
