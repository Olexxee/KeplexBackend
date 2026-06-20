import { Router } from "express";
import * as c from "./address.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateParams, validateBody } from "../../middlewares/validateMiddleware.js";
import { createAddressSchema, updateAddressSchema, addressIdSchema } from "./address.validator.js";

const addressRouter = Router();

addressRouter.use(authMiddleware);

addressRouter.get("/", c.getMyAddresses);
addressRouter.post("/", validateBody(createAddressSchema), c.create);
addressRouter.patch("/:id", c.update);
addressRouter.delete("/:id", c.remove);
addressRouter.patch(
  "/:id/default",
  validateParams(addressIdSchema),
c.setDefault,
);

export default addressRouter;
