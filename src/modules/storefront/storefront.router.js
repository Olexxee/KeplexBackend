import { Router } from "express";
import { getStorefrontConfig } from "./storefront.controller.js";

const storefrontRouter = Router();

storefrontRouter.get("/config", getStorefrontConfig);

export default storefrontRouter;
