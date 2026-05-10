import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as organisationService from "./organisation.service.js";

export const getOrganisation = asyncWrapper(async (req, res) => {
  const organisation = await organisationService.getOrganisation();

  return successResponse({
    res,
    message: "Organisation profile fetched successfully",
    data: organisation,
  });
});

export const upsertOrganisation = asyncWrapper(async (req, res) => {
  const organisation = await organisationService.upsertOrganisation(req.body);

  return successResponse({
    res,
    message: "Organisation profile saved successfully",
    data: organisation,
  });
});
