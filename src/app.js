import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

// MODULES
import dashboardRouter from "./modules/dashboard/dashboard.routes.js";
import addressRouter from "./modules/address/address.routes.js";
import paymentRouter from "./modules/payment/payment.routes.js";
import webhookRouter from "./webhook/webhook.routes.js";
import collectionRouter from "./modules/collections/collection.routes.js";
import organisationRouter from "./modules/organization/organisation.routes.js";
import cartRouter from "./modules/cart/cart.routes.js";
import fulfillmentRouter from "./modules/fulfillment/fulfillment.routes.js";
import notificationRouter from "./modules/notifications/notification.routes.js";
import categoryRouter from "./modules/categories/category.routes.js";
import configRouter from "./modules/business-config/businessConfig.routes.js";
import orderRouter from "./modules/order/order.routes.js";
import brandRouter from "./modules/brands/brand.routes.js";
import adminRouter from "./modules/admin/admin.routes.js";
import testimonialRouter from "./modules/testimonials/testimonialRoutes.js";
import authRouter from "./modules/auth/auth.routes.js";
import auditRouter from "./modules/audit/audit.routes.js";
import productRouter from "./modules/products/product.routes.js";
import shippingRouter from "./modules/shipping/shipping.routes.js";
import variantRouter from "./modules/variants/variant.routes.js";
import reviewRouter from "./modules/reviews/review.routes.js";
import wishlistRouter from "./modules/wishlist/wishlist.routes.js";
import warehouseRouter from "./modules/warehouse/warehouse.routes.js";
import storefrontRouter from "./modules/storefront/storefront.router.js";
import productAdminRouter from "./modules/products/product.admin.routes.js";
import variantAdminRouter from "./modules/variants/variant.admin.routes.js";
import { env } from "./config/env.js";
import { NotFoundError } from "./classes/errorClasses.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";


export const app = express();

// ── Webhook route FIRST — before any body parsers touch the stream ──
app.use("/api/webhooks", webhookRouter);

// ── CORS ──

const normalizeOrigin = (url) =>
  typeof url === "string"
    ? url.trim().replace(/\/+$/, "")
    : url;

const configuredOrigins = (env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",

  // Production frontends
  "https://atc-shopping.vercel.app",
  "https://keplexregistration.vercel.app",

  // Existing single frontend variable
  env.FRONTEND_URL,

  // Additional origins from environment
  ...configuredOrigins,
]
  .map(normalizeOrigin)
  .filter(Boolean)
  .filter((origin, index, array) => array.indexOf(origin) === index);

// Optional: allow Vercel preview deployments.
const allowedVercelPreviewPatterns = [
  /^https:\/\/atc-shopping-[a-z0-9-]+\.vercel\.app$/,
  /^https:\/\/keplexregistration-[a-z0-9-]+\.vercel\.app$/,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header:
      // curl, Postman, server-to-server requests, etc.
      if (!origin) {
        return callback(null, true);
      }

      const normalized = normalizeOrigin(origin);

      const isExactMatch = allowedOrigins.includes(normalized);

      const isPreviewMatch = allowedVercelPreviewPatterns.some((re) =>
        re.test(normalized),
      );

      if (isExactMatch || isPreviewMatch) {
        return callback(null, true);
      }

      console.error(
        `[CORS Blocked] raw origin: ${JSON.stringify(origin)} | ` +
          `normalized: ${JSON.stringify(normalized)} | ` +
          `allowedOrigins: ${JSON.stringify(allowedOrigins)}`,
      );

      return callback(new Error("Not allowed by CORS"));
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
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Keplex backend is running",
    environment: process.env.NODE_ENV,
  });
});

// ── Routes ──
app.use("/api/auth", authRouter);
app.use("/api/organisation", organisationRouter);
app.use("/api/category", categoryRouter);
app.use("/api/cart", cartRouter);
app.use("/api/fulfillments", fulfillmentRouter);
app.use("/api/orders", orderRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/addresses", addressRouter);
app.use("/api/audit", auditRouter);
app.use("/api/admin", adminRouter);
app.use("/api/brands", brandRouter);
app.use("/api/collections", collectionRouter);
app.use("/api/business-config", configRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/testimonial", testimonialRouter);
app.use("/api/admin/products", productAdminRouter);
app.use("/api/admin/variants", variantAdminRouter);
app.use("/api/products", productRouter);
app.use("/api/variants", variantRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/shipping", shippingRouter);
app.use("/api/warehouses", warehouseRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/storefront", storefrontRouter);

// ── 404 handler ──
app.use((req, res, next) => {
  next(new NotFoundError(`Route not found: ${req.originalUrl}`));
});

app.use(errorMiddleware);