import * as offersService from "./offers.service.js";
import { asyncWrapper } from "../../lib/asyncWrapper.js";

export const getPublicOffers = asyncWrapper(async (_req, res) => {
  const data = await offersService.getPublicOffers();

  return res.json({
    success: true,
    data,
  });
});
