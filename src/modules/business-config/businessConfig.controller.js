import * as businessConfigService from "./businessConfig.service.js";
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";

export const getAllConfigs = asyncWrapper(async (req, res) => {
  const configs = await businessConfigService.getAllConfigs();

  return successResponse({
    res,
    message: "Business configurations fetched successfully",
    data: configs,
  });
});

export const getConfigByKey = asyncWrapper(async (req, res) => {
  const config = await businessConfigService.getConfigByKey(req.params.key);

  return successResponse({
    res,
    message: "Configuration fetched successfully",
    data: config,
  });
});

export const updateConfig = asyncWrapper(async (req, res) => {
  const config = await businessConfigService.updateConfig({
    key: req.params.key,
    value: req.body.value,
  });

  return successResponse({
    res,
    message: "Configuration updated successfully",
    data: config,
  });
});
