import express from "express";
import { smartShopping } from "./smartShopping.controller.js";
import { smartShoppingRequestSchema } from "./smartShopping.validator.js";
import {validateBody} from "../../middlewares/validateMiddleware.js"

const smartshoppingRouter = express.Router();

smartshoppingRouter.post("/", validateBody(smartShoppingRequestSchema), smartShopping);

export default smartshoppingRouter;
