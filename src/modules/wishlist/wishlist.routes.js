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
  variantIdSchema,
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
  "/:variantId/check",
  validateParams(variantIdSchema),
  wishlistController.checkInWishlist,
);

wishlistRouter.delete(
  "/:variantId",
  validateParams(variantIdSchema),
  wishlistController.removeFromWishlist,
);

export default wishlistRouter;
