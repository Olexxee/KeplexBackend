import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

// MODULES
import dashboardRouter from "./modules/dashboard/dashboard.routes.js";
import addressRouter from "./modules/address/address.routes.js";
import paymentRouter from "./modules/payment/payment.routes.js";
import webhookRouter from "./modules/payment/webhook/webhook.routes.js";
import organisationRouter from "./modules/organization/organisation.routes.js";
import itemRouter from "./modules/item/item.routes.js";
import cartRouter from "./modules/cart/cart.routes.js";
import notificationRouter from "./modules/notifications/notification.routes.js";
import categoryRouter from "./modules/categories/category.routes.js";
import configRouter from "./modules/business-config/businessConfig.routes.js";
import orderRouter from "./modules/order/order.routes.js";
import adminRouter from "./modules/admin/admin.routes.js";
import testimonialRouter from "./modules/testimonials/testimonialRoutes.js";
import authRouter from "./modules/auth/auth.routes.js";
import trainingRouter from "./modules/training-programs/trainingProgram.routes.js";
import registrationRouter from "./modules/registration/registration.routes.js";
import auditRouter from "./modules/audit/audit.routes.js";

import { env } from "./config/env.js";
import { NotFoundError } from "./classes/errorClasses.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";

export const app = express();

// ── Webhook route FIRST — before any body parsers touch the stream ──
app.use("/api/webhooks", webhookRouter);

// ── CORS ──
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://keplexshopping.vercel.app",
  "https://keplexregistration.vercel.app",
  env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(
          `[CORS Blocked]: Request from origin ${origin} was denied.`,
        );
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// ── Global middleware ──
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ── Health check ──
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Keplex backend is running",
  });
});

// ── Routes ──
app.use("/api/auth", authRouter);
app.use("/api/organisation", organisationRouter);
app.use("/api/category", categoryRouter);
app.use("/api/cart", cartRouter);
app.use("/api/items", itemRouter);
app.use("/api/orders", orderRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/addresses", addressRouter);
app.use("/api/audit", auditRouter);
app.use("/api/admin", adminRouter);
app.use("/api/registrations", registrationRouter);
app.use("/api/training-programs", trainingRouter);
app.use("/api/business-config", configRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/testimonial", testimonialRouter);

// ── 404 handler ──
app.use((req, res, next) => {
  next(new NotFoundError(`Route not found: ${req.originalUrl}`));
});

// ── Error middleware — must be last ──
app.use(errorMiddleware);
