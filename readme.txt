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