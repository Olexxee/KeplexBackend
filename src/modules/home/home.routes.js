// modules/home/home.routes.js
import { Router } from "express";
import * as homeController from "./home.controller.js";

const homeRouter = Router();

// Public route - no authentication required
homeRouter.get("/", homeController.getHomepage);

export default homeRouter;
