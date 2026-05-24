import { Router } from "express";
import * as c from "./address.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const addressRouter = Router();

addressRouter.use(authMiddleware);

addressRouter.get("/", c.getMyAddresses);
addressRouter.post("/", c.create);
addressRouter.patch("/:id", c.update);
addressRouter.delete("/:id", c.remove);

export default addressRouter;
