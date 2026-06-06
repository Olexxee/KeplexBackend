import * as checkoutService from "./checkout.service.js";
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";

// POST /checkout
export const checkout = asyncWrapper(async (req, res) => {
  const { customerName, customerEmail, customerPhone, notes, addressId } =
    req.body;

  const order = await checkoutService.checkout({
    userId: req.user.id,
    payload: { customerName, customerEmail, customerPhone, notes, addressId },
  });

  return successResponse({
    res,
    statusCode: 201,
    message: "Order created",
    data: order,
  });
});
