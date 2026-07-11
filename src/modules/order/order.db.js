import { prisma } from "../../config/prisma.js";

const orderInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              brand: {
                select: {
                  id: true,
                  name: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  },
  payments: true,
  fulfillments: {
    include: {
      items: true,
      warehouse: true,
    },
  },
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
};

/**
 * Generate order number
 */
export const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `KEP-${timestamp}-${random}`;
};

/**
 * CART
 */
export const findActiveCartForCheckout = async (userId, tx = prisma) => {
  return tx.cart.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  brand: true,
                  category: true,
                },
              },
            },
          },
        },
      },
    },
  });
};

/**
 * ORDER CREATE
 */
export const createOrderFromCart = async (
  {
    userId,
    payload,
    address,
    cart,
    totalAmount,
    shippingCost,
    taxAmount,
    cbmData,
    itemsWithCBM,
  },
  tx = prisma,
) => {
  // Calculate totals from cart
  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.unitPriceSnapshot) * item.quantity,
    0,
  );

  const totalCBM = itemsWithCBM.reduce((sum, item) => sum + item.cbm, 0);
  const totalChargeableWeight = itemsWithCBM.reduce(
    (sum, item) => sum + item.chargeableWeight,
    0,
  );

  return tx.order.create({
    data: {
      userId,
      orderNumber: generateOrderNumber(),
      customerName: address.fullName,
      customerEmail: address.email || null,
      customerPhone: address.phone,
      shippingLabel: address.label || null,
      shippingStreet: address.addressLine,
      shippingCity: address.city,
      shippingState: address.state || null,
      shippingCountry: address.country || "NG",

      subtotal,
      shippingCost: shippingCost || 0,
      taxAmount: taxAmount || 0,
      totalAmount,

      status: "PENDING",
      notes: payload.notes || null,

      // Store CBM data
      cbm: parseFloat(totalCBM.toFixed(4)),
      chargeableWeight: parseFloat(totalChargeableWeight.toFixed(2)),
      cbmData: {
        totalCBM: parseFloat(totalCBM.toFixed(4)),
        totalChargeableWeight: parseFloat(totalChargeableWeight.toFixed(2)),
        items: itemsWithCBM.map((item) => ({
          variantId: item.variantId,
          sku: item.variant?.sku,
          productName: item.variant?.product?.name,
          quantity: item.quantity,
          cbm: item.cbm,
          chargeableWeight: item.chargeableWeight,
          dimensions: {
            length: item.variant?.length,
            width: item.variant?.width,
            height: item.variant?.height,
          },
        })),
      },

      // Store fulfillment groupings
      fulfillmentGroups: payload.fulfillmentGroups || null,

      items: {
        create: cart.items.map((cartItem) => {
          const itemCBM = itemsWithCBM.find(
            (item) => item.variantId === cartItem.variantId,
          );
          return {
            variantId: cartItem.variantId,
            quantity: cartItem.quantity,
            unitPriceSnapshot: cartItem.unitPriceSnapshot,
            totalPrice: Number(cartItem.unitPriceSnapshot) * cartItem.quantity,
            cbm: itemCBM?.cbm || 0,
            chargeableWeight: itemCBM?.chargeableWeight || 0,
          };
        }),
      },
    },
    include: orderInclude,
  });
};

/**
 * ORDERS LIST
 */
export const findOrders = async ({
  status,
  userId,
  search,
  startDate,
  endDate,
  skip = 0,
  take = 20,
} = {}) => {
  const where = {
    ...(status && { status }),
    ...(userId && { userId }),
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(startDate && {
      createdAt: {
        gte: new Date(startDate),
      },
    }),
    ...(endDate && {
      createdAt: {
        lte: new Date(endDate),
      },
    }),
  };

  return Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            status: true,
            amount: true,
            provider: true,
          },
        },
        fulfillments: {
          include: {
            items: true,
            warehouse: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take,
    }),
    prisma.order.count({ where }),
  ]);
};

/**
 * SINGLE ORDER
 */
export const findOrderById = async (id) => {
  return prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });
};

export const findOrderByOrderNumber = async (orderNumber) => {
  return prisma.order.findUnique({
    where: { orderNumber },
    include: orderInclude,
  });
};

/**
 * ORDER STATUS
 */
export const updateOrderStatus = async (id, status) => {
  return prisma.order.update({
    where: { id },
    data: { status },
    include: orderInclude,
  });
};

/**
 * STOCK OPERATIONS
 */
export const decrementVariantStock = async (
  { variantId, quantity },
  tx = prisma,
) => {
  return tx.productVariant.updateMany({
    where: {
      id: variantId,
      stock: {
        gte: quantity,
      },
    },
    data: {
      stock: {
        decrement: quantity,
      },
    },
  });
};

export const restoreOrderItemStock = async (
  { variantId, quantity },
  tx = prisma,
) => {
  return tx.productVariant.update({
    where: { id: variantId },
    data: {
      stock: {
        increment: quantity,
      },
    },
  });
};

/**
 * TRANSACTIONAL ORDER UPDATE
 */
export const updateOrderStatusTx = async (id, data, tx = prisma) => {
  return tx.order.update({
    where: { id },
    data,
    include: orderInclude,
  });
};

/**
 * ORDER CBM UPDATE
 */
export const updateOrderCBM = async (id, cbmData, tx = prisma) => {
  return tx.order.update({
    where: { id },
    data: {
      cbm: cbmData.totalCBM,
      chargeableWeight: cbmData.totalChargeableWeight,
      cbmData: cbmData,
      cbmUpdatedAt: new Date(),
      cbmUpdatedBy: cbmData.updatedBy,
    },
    include: orderInclude,
  });
};

/**
 * ORDER METRICS
 */
export const getOrderMetrics = async () => {
  const [
    totalOrders,
    pendingOrders,
    processingOrders,
    completedOrders,
    cancelledOrders,
    totalRevenue,
    todayOrders,
    todayRevenue,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "PROCESSING" } }),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.order.count({ where: { status: "CANCELLED" } }),
    prisma.order.aggregate({
      where: { status: "COMPLETED" },
      _sum: { totalAmount: true },
    }),
    prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.order.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    totalOrders,
    pendingOrders,
    processingOrders,
    completedOrders,
    cancelledOrders,
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    todayOrders,
    todayRevenue: todayRevenue._sum.totalAmount || 0,
  };
};

/**
 * ORDER TIMELINE - AUDIT LOGS
 */
export const findOrderAuditLogs = async (orderId) => {
  return prisma.auditLog.findMany({
    where: {
      entity: "Order",
      entityId: orderId,
      action: "ORDER_STATUS_CHANGE",
    },
    orderBy: { createdAt: "asc" },
  });
};

/**
 * ORDER TIMELINE - PAYMENTS
 */
export const findOrderPayments = async (orderId) => {
  return prisma.payment.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
  });
};

/**
 * ORDER TIMELINE - FULFILLMENTS
 */
export const findOrderFulfillments = async (orderId) => {
  return prisma.fulfillment.findMany({
    where: { orderId },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });
};

/**
 * ORDERS BY FULFILLMENT TYPE
 */
export const findOrdersByFulfillmentType = async (fulfillmentType) => {
  return prisma.order.findMany({
    where: {
      fulfillmentGroups: {
        path: "$.types",
        array_contains: fulfillmentType,
      },
    },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
      },
      fulfillments: {
        where: {
          type: fulfillmentType,
        },
      },
    },
  });
};

/**
 * CREATE AUDIT LOG
 */
export const createAuditLog = async (data, tx = prisma) => {
  return tx.auditLog.create({
    data,
  });
};
