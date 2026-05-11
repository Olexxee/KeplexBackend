import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as paymentService from "./payment.service.js";

export const initializePayment = asyncWrapper(async (req, res) => {
  const payment = await paymentService.initializePayment({
    orderId: req.params.orderId,
    user: req.user,
  });

  return successResponse({
    res,
    statusCode: 201,
    message: "Payment initialized successfully",
    data: payment,
  });
});

export const verifyPayment = asyncWrapper(async (req, res) => {
  const payment = await paymentService.verifyPayment(req.params.reference);

  return successResponse({
    res,
    message: "Payment verified successfully",
    data: payment,
  });
});
