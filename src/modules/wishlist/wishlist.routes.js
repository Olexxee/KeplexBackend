import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";
import * as wishlistController from "./wishlist.controller.js";
import {
  addToWishlistSchema,
  productIdSchema,
  batchCheckWishlistSchema,
  getWishlistQuerySchema,
} from "./wishlist.validation.js";

const wishlistRouter = Router();

wishlistRouter.use(authMiddleware);

wishlistRouter.get(
  "/",
  validateQuery(getWishlistQuerySchema),
  wishlistController.getWishlist,
);

wishlistRouter.post(
  "/",
  validateBody(addToWishlistSchema),
  wishlistController.addToWishlist,
);

wishlistRouter.post(
  "/batch-check",
  validateBody(batchCheckWishlistSchema),
  wishlistController.batchCheckWishlist,
);

wishlistRouter.delete("/clear", wishlistController.clearWishlist);

wishlistRouter.get(
  "/:productId/check",
  validateParams(productIdSchema),
  wishlistController.checkInWishlist,
);

wishlistRouter.delete(
  "/:productId",
  validateParams(productIdSchema),
  wishlistController.removeFromWishlist,
);

export default wishlistRouter;
