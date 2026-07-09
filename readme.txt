// stack
Runtime: Node.js
Framework: Express
Database: PostgreSQL
ORM: Prisma
Auth: JWT + bcrypt
Validation: Joi
Upload: multer + Cloudinary later

// Other of build
1. App/server setup
2. Env config
3. Prisma connection
4. Error classes
5. Response helper
6. Validation middleware
7. User/auth module
8. Role middleware
9. Organisation profile
10. Category + item engine

// server.js
app.js
env.js
prisma.js
errorClasses.js
asyncWrapper.js
errorMiddleware.js
response.js

// Things still needed to be done
pagination
rate limiting
query sanitization
helmet tuning
request logging
input normalization

1. Payment integration
2. Inventory restoration rules
3. Admin analytics/dashboard
4. Notification queue
5. Public storefront APIs
6. Frontend integration


// How to send Notifications in other modules

// modules/order/order.service.js
import { enqueueNotification } from "../notifications/notification.queue.js";
import { NOTIFICATION_JOBS } from "../notifications/notification.jobs.js";

export const confirmOrder = async (orderId) => {
  // ... your existing order logic

  await enqueueNotification({
    name: NOTIFICATION_JOBS.ORDER_CONFIRMED,
    data: { order },
  });
};

Cart

items[]

localSummary

importSummary

subtotal

shipping

total

backend/
├── src/
│   ├── modules/
│   │   ├── products/ (NEW - replaces items)
│   │   │   ├── product.controller.js 🆕
│   │   │   ├── product.service.js 🆕
│   │   │   ├── product.db.js 🆕
│   │   │   ├── product.routes.js 🆕
│   │   │   └── product.validation.js 🆕
│   │   │
│   │   ├── variants/ (NEW)
│   │   │   ├── variant.controller.js 🆕
│   │   │   ├── variant.service.js 🆕
│   │   │   ├── variant.db.js 🆕
│   │   │   ├── variant.routes.js 🆕
│   │   │   ├── variant.validation.js 🆕
│   │   │   └── sku.generator.js 🆕
│   │   │
│   │   ├── brands/ (NEW)
│   │   │   ├── brand.controller.js 🆕
│   │   │   ├── brand.service.js 🆕
│   │   │   ├── brand.db.js 🆕
│   │   │   ├── brand.routes.js 🆕
│   │   │   └── brand.validation.js 🆕
│   │   │
│   │   ├── collections/ (NEW)
│   │   │   ├── collection.controller.js 🆕
│   │   │   ├── collection.service.js 🆕
│   │   │   ├── collection.db.js 🆕
│   │   │   ├── collection.routes.js 🆕
│   │   │   └── collection.validation.js 🆕
│   │   │
│   │   ├── shipping/ (NEW)
│   │   │   ├── shipping.controller.js 🆕
│   │   │   ├── shipping.service.js 🆕
│   │   │   ├── shipping.db.js 🆕
│   │   │   ├── shipping.routes.js 🆕
│   │   │   ├── shipping.validation.js 🆕
│   │   │   ├── shipping.calculator.js 🆕
│   │   │   ├── cbm.calculator.js 🆕 (CRITICAL FOR SEA FREIGHT)
│   │   │   └── shipping.config.js 🆕
│   │   │
│   │   ├── fulfillment/ (NEW)
│   │   │   ├── fulfillment.controller.js 🆕
│   │   │   ├── fulfillment.service.js 🆕
│   │   │   ├── fulfillment.db.js 🆕
│   │   │   ├── fulfillment.routes.js 🆕
│   │   │   ├── fulfillment.validation.js 🆕
│   │   │   ├── order.splitter.js 🆕
│   │   │   └── warehouse.manager.js 🆕
│   │   │
│   │   ├── inventory/ (NEW)
│   │   │   ├── inventory.controller.js 🆕
│   │   │   ├── inventory.service.js 🆕
│   │   │   ├── inventory.db.js 🆕
│   │   │   ├── inventory.routes.js 🆕
│   │   │   ├── inventory.validation.js 🆕
│   │   │   ├── stock.adjustment.js 🆕
│   │   │   └── lowstock.alert.js 🆕
│   │   │
│   │   ├── promotions/ (NEW)
│   │   │   ├── promotions.controller.js 🆕
│   │   │   ├── promotions.service.js 🆕
│   │   │   ├── promotions.db.js 🆕
│   │   │   ├── promotions.routes.js 🆕
│   │   │   ├── promotions.validation.js 🆕
│   │   │   ├── coupon.validator.js 🆕
│   │   │   └── discount.engine.js 🆕
│   │   │
│   │   ├── cms/ (NEW)
│   │   │   ├── cms.controller.js 🆕
│   │   │   ├── cms.service.js 🆕
│   │   │   ├── cms.db.js 🆕
│   │   │   ├── cms.routes.js 🆕
│   │   │   ├── cms.validation.js 🆕
│   │   │   ├── banner.manager.js 🆕
│   │   │   └── homepage.builder.js 🆕
│   │   │
│   │   ├── wishlist/ (NEW)
│   │   │   ├── wishlist.controller.js 🆕
│   │   │   ├── wishlist.service.js 🆕
│   │   │   ├── wishlist.db.js 🆕
│   │   │   ├── wishlist.routes.js 🆕
│   │   │   └── wishlist.validation.js 🆕
│   │   │
│   │   ├── reviews/ (NEW)
│   │   │   ├── review.controller.js 🆕
│   │   │   ├── review.service.js 🆕
│   │   │   ├── review.db.js 🆕
│   │   │   ├── review.routes.js 🆕
│   │   │   ├── review.validation.js 🆕
│   │   │   └── review.moderation.js 🆕
│   │   │
│   │   ├── reports/ (NEW)
│   │   │   ├── reports.controller.js 🆕
│   │   │   ├── reports.service.js 🆕
│   │   │   ├── reports.db.js 🆕
│   │   │   ├── reports.routes.js 🆕
│   │   │   ├── reports.validation.js 🆕
│   │   │   ├── revenue.report.js 🆕
│   │   │   ├── sales.report.js 🆕
│   │   │   └── inventory.report.js 🆕
│   │   │
│   │   ├── dashboard/ (NEW)
│   │   │   ├── dashboard.controller.js 🆕
│   │   │   ├── dashboard.service.js 🆕
│   │   │   ├── dashboard.db.js 🆕
│   │   │   └── dashboard.routes.js 🆕
│   │   │
│   │   ├── notifications/ (NEW)
│   │   │   ├── notification.controller.js 🆕
│   │   │   ├── notification.service.js 🆕
│   │   │   ├── notification.db.js 🆕
│   │   │   ├── notification.routes.js 🆕
│   │   │   ├── email.service.js 🆕
│   │   │   └── sms.service.js 🆕
│   │   │
│   │   └── integrations/ (NEW)
│   │       ├── dhl/
│   │       │   ├── dhl.service.js 🆕
│   │       │   └── dhl.config.js 🆕
│   │       ├── fedex/
│   │       │   ├── fedex.service.js 🆕
│   │       │   └── fedex.config.js 🆕
│   │       └── sea-freight/
│   │           ├── seafreight.service.js 🆕
│   │           ├── seafreight.config.js 🆕
│   │           └── cbm.calculator.js 🆕 (CRITICAL)
│   │
│   ├── jobs/ (NEW - for background tasks)
│   │   ├── lowstock.job.js 🆕
│   │   ├── order.timeout.job.js 🆕
│   │   ├── flashsale.job.js 🆕
│   │   └── report.generator.job.js 🆕
│   │
│   └── webhooks/ (NEW)
│       ├── paystack.webhook.js 🆕
│       ├── shipping.webhook.js 🆕
│       └── webhook.handler.js 🆕

npx prisma migrate dev --name add_product_variants_cbm
npx prisma migrate dev --name add_shipping_models
npx prisma migrate dev --name add_fulfillment_models