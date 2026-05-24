import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { handlePaystackWebhook } from "./modules/payment/paystackWebhook.controller.js";
import dashboardRouter from "./modules/dashboard/dashboard.routes.js";
import addressRouter from "./modules/address/address.routes.js";
import paymentRouter from "./modules/payment/payment.routes.js";
import organisationRouter from "./modules/organization/organisation.routes.js";
import itemRouter from "./modules/item/item.routes.js";
import cartRouter from "./modules/cart/cart.routes.js";
import categoryRouter from "./modules/categories/category.routes.js";
import orderRouter from "./modules/order/order.routes.js";
import testimonialRouter from "./modules/testimonials/testimonialRoutes.js";
import authRouter from "./modules/auth/auth.routes.js";
import registrationRouter from "./modules/registration/registration.routes.js";
import { env } from "./config/env.js";
import { NotFoundError } from "./classes/errorClasses.js";
import auditRouter from "./modules/audit/audit.routes.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";

export const app = express();

app.use("/api/payments", handlePaystackWebhook);

const allowedOrigins = [
  "http://localhost:5173",
  "https://keplexshopping.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
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


app.use(errorMiddleware);
app.use("/api/auth", authRouter); // Already works
app.use("/api/organisation", organisationRouter); // Already works
app.use("/api/category", categoryRouter); // Working
app.use("/api/cart", cartRouter);
app.use("/api/items", itemRouter); // Working
app.use("/api/orders", orderRouter); // Working
app.use("/api/payments", paymentRouter);
app.use("/api/dashboard", dashboardRouter); //Working
app.use("/api/addresses", addressRouter);
app.use("/api/audit", auditRouter);
// app.use("/api/registrations", registrationRouter);
// app.use("/api/testimonials", testimonialRouter);
app.use((req, res, next) => {
  next(new NotFoundError(`Route not found: ${req.originalUrl}`));
  });
  