import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import organisationRouter from "./modules/organization/organisation.routes.js";
import itemRouter from "./modules/item/item.routes.js";
import cartRouter from "./modules/cart/cart.routes.js";
import categoryRouter from "./modules/categories/category.routes.js";
import orderRouter from "./modules/order/order.routes.js";
import authRouter from "./modules/auth/auth.routes.js";
import { env } from "./config/env.js";
import { NotFoundError } from "./classes/errorClasses.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";

export const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  }),
);

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Organisation backend is running",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/organisation", organisationRouter);
app.use("/api/category", categoryRouter);
app.use("/api/cart", cartRouter);
app.use("/api/items", itemRouter);
app.use("/api/orders", orderRouter);
app.use((req, res, next) => {
  next(new NotFoundError(`Route not found: ${req.originalUrl}`));
});

app.use(errorMiddleware);
