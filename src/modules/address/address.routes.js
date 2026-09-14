import { Router } from "express";
import * as c from "./address.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  validateParams,
  validateBody,
} from "../../middlewares/validateMiddleware.js";
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdSchema,
} from "./address.validator.js";



const addressRouter = Router();

addressRouter.use(authMiddleware);

addressRouter.get("/", c.getMyAddresses);

addressRouter.post("/", validateBody(createAddressSchema), c.create);

addressRouter.patch(
  "/:id",
  validateParams(addressIdSchema),
  validateBody(updateAddressSchema),
  c.update,
);

addressRouter.patch(
  "/:id/default",
  validateParams(addressIdSchema),
  c.setDefault,
);

addressRouter.delete("/:id", validateParams(addressIdSchema), c.remove);

export default addressRouter;
