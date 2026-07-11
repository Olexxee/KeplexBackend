import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as homeService from "./home.service.js";

/**
 * GET /api/home
 * Returns all data needed for the homepage
 */
export const getHomepage = asyncWrapper(async (req, res) => {
  const data = await homeService.getHomepage();

  return successResponse({
    res,
    message: "Homepage data fetched successfully",
    data,
  });
});
