import { Router } from "express";
import * as c from "./address.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", c.getMyAddresses);
router.post("/", c.create);
router.patch("/:id", c.update);
router.delete("/:id", c.remove);

export default router;
