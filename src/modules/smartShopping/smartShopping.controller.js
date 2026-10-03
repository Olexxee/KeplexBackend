import {asyncWrapper} from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as smartShoppingService from "./smartShopping.service.js";

export const smartShopping = asyncWrapper(async (req, res) => {
  const { message, destination = null } = req.body;

  const result = await smartShoppingService.smartShop({
    message,
    destination,
  });

  return successResponse({
    res,
    statusCode: 200,
    message: "Smart Shopping results generated successfully",
    data: result,
  });
});
