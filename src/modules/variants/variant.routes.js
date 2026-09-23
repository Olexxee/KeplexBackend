import { Router } from "express";
import { validateParams } from "../../middlewares/validateMiddleware.js";
import * as controller from "./variant.controller.js";
import { variantIdSchema } from "./variant.validation.js";
import { productIdSchema } from "../products/product.validation.js";

const router = Router();

router.get(
  "/product/:productId",
  validateParams(productIdSchema),
  controller.getProductVariants,
);
router.get("/:id", validateParams(variantIdSchema), controller.getVariant);

export default router;
