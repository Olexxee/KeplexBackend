import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as dashboardService from "./dashboard.service.js";

export const getDashboardOverview = asyncWrapper(async (req, res) => {
  const overview = await dashboardService.getDashboardOverview();

  return successResponse({
    res,
    message: "Dashboard overview fetched successfully",
    data: overview,
  });
});
