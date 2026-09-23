import { Router } from "express";
import {
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";
import * as productController from "./product.controller.js";
import {
  productIdSchema,
  productSlugSchema,
  getProductsQuerySchema,
} from "./product.validation.js";

const productRouter = Router();

productRouter.get(
  "/",
  validateQuery(getProductsQuerySchema),
  productController.getProducts,
);
productRouter.get(
  "/featured",
  validateQuery(getProductsQuerySchema),
  productController.getFeaturedProducts,
);
productRouter.get(
  "/new-arrivals",
  validateQuery(getProductsQuerySchema),
  productController.getNewArrivals,
);
productRouter.get(
  "/best-sellers",
  validateQuery(getProductsQuerySchema),
  productController.getBestSellers,
);
productRouter.get(
  "/slug/:slug",
  validateParams(productSlugSchema),
  productController.getProductBySlug,
);
productRouter.get(
  "/:id/related",
  validateParams(productIdSchema),
  validateQuery(getProductsQuerySchema),
  productController.getRelatedProducts,
);
productRouter.get(
  "/:id/variants",
  validateParams(productIdSchema),
  productController.getProductVariants,
);
productRouter.get(
  "/:id",
  validateParams(productIdSchema),
  productController.getProductById,
);

export default productRouter;
