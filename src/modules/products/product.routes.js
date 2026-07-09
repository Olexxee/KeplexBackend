import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";
import * as productController from "./product.controller.js";
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  productSlugSchema,
  getProductsQuerySchema,
  updateProductStatusSchema,
} from "./product.validation.js";



const productRouter = Router();

// Public routes (no auth required)
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

// Admin routes (auth required)
productRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateBody(createProductSchema),
  productController.createProduct,
);

productRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(productIdSchema),
  validateBody(updateProductSchema),
  productController.updateProduct,
);

productRouter.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN", "STAFF"),
  validateParams(productIdSchema),
  validateBody(updateProductStatusSchema),
  productController.updateProductStatus,
);

productRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN", "ADMIN"),
  validateParams(productIdSchema),
  productController.deleteProduct,
);

export default productRouter;
