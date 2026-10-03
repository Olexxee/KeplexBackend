import { Router } from "express";
import sourcingPublicRouter from "./sourcing.public.routes.js";
import sourcingAdminRouter from "./sourcing.admin.routes.js";

const sourcingRouter = Router();

sourcingRouter.use("/admin", sourcingAdminRouter);
sourcingRouter.use("/", sourcingPublicRouter);

export default sourcingRouter;
