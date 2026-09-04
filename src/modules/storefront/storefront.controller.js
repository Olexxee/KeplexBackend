import * as storefrontService from "./storefront.service.js";
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";

export const getStorefrontConfig = asyncWrapper(async (_req, res) => {
  const config = await storefrontService.getStorefrontConfig();

  return successResponse({
    res,
    message: "Storefront configuration fetched successfully",
    data: config,
  });
});
