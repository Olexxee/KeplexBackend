import { prisma } from "../../config/prisma.js";

// ============================================================
// SHARED INCLUDES
// ============================================================

const variantMediaSelect = {
  id: true,
  url: true,
  isPrimary: true,
  sortOrder: true,
};

const productInclude = {
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
};

const variantInclude = {
  media: {
    select: variantMediaSelect,
  },

  product: {
    include: productInclude,
  },
};

const orderInclude = {
  items: {
    include: {
      variant: {
        include: variantInclude,
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

// ============================================================
// ORDER NUMBER
// ============================================================

export const generateOrderNumber = () => {
  const timestamp = Date.now()
    .toString(36)
    .toUpperCase();

  const random = Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase();

  return `KEP-${timestamp}-${random}`;
};

// ============================================================
// CART
// ============================================================

export const findActiveCartForCheckout = async (
  userId,
  tx = prisma,
) => {
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
              product: true,
            },
          },
        },
      },
    },
  });
};

// ============================================================
// ORDER CREATE
// ============================================================

export const createOrderFromCart = async (
  {
    userId,
    payload,
    address,
    cart,
    totalAmount,
    shippingCost,
    taxAmount,
    itemsWithCBM,
  },
  tx = prisma,
) => {
  const subtotal = cart.items.reduce(
    (sum, item) =>
      sum +
      Number(item.unitPriceSnapshot) *
        Number(item.quantity),
    0,
  );

  const calculatedItems = Array.isArray(
    itemsWithCBM,
  )
    ? itemsWithCBM
    : [];

  const totalCBM = calculatedItems.reduce(
    (sum, item) =>
      sum + Number(item.cbm || 0),
    0,
  );

  const totalChargeableWeight =
    calculatedItems.reduce(
      (sum, item) =>
        sum +
        Number(
          item.chargeableWeight || 0,
        ),
      0,
    );

  const normalizedCBM = Number(
    totalCBM.toFixed(4),
  );

  const normalizedChargeableWeight =
    Number(
      totalChargeableWeight.toFixed(2),
    );

  return tx.order.create({
    data: {
      // ------------------------------------------------------
      // USER
      // ------------------------------------------------------

      userId,

      orderNumber:
        generateOrderNumber(),

      // ------------------------------------------------------
      // CUSTOMER SNAPSHOT
      // ------------------------------------------------------

      customerName:
        address.fullName,

      customerEmail:
        address.email || null,

      customerPhone:
        address.phone,

      // ------------------------------------------------------
      // SHIPPING ADDRESS SNAPSHOT
      // ------------------------------------------------------

      shippingLabel:
        address.label || null,

      shippingStreet:
        address.addressLine,

      shippingCity:
        address.city,

      shippingState:
        address.state || null,

      shippingCountry:
        address.country || "NG",

      // ------------------------------------------------------
      // FINANCIALS
      // ------------------------------------------------------

      subtotal,

      shippingCost:
        Number(shippingCost || 0),

      taxAmount:
        Number(taxAmount || 0),

      totalAmount:
        Number(totalAmount),

      // ------------------------------------------------------
      // ORDER STATE
      // ------------------------------------------------------

      status: "PENDING",

      notes:
        payload.notes || null,

      // ------------------------------------------------------
      // SHIPPING METRICS
      // ------------------------------------------------------

      cbm:
        normalizedCBM,

      chargeableWeight:
        normalizedChargeableWeight,

      cbmData: {
        totalCBM:
          normalizedCBM,

        totalChargeableWeight:
          normalizedChargeableWeight,

        items: calculatedItems.map(
          (item) => ({
            variantId:
              item.variantId,

            quantity:
              Number(
                item.quantity || 0,
              ),

            cbm:
              Number(
                item.cbm || 0,
              ),

            actualWeight:
              Number(
                item.actualWeight || 0,
              ),

            volumetricWeight:
              Number(
                item.volumetricWeight || 0,
              ),

            chargeableWeight:
              Number(
                item.chargeableWeight ||
                  0,
              ),

            shippingType:
              item.shippingType ||
              "LOCAL",

            dimensions: {
              length:
                item.length != null
                  ? Number(
                      item.length,
                    )
                  : null,

              width:
                item.width != null
                  ? Number(
                      item.width,
                    )
                  : null,

              height:
                item.height != null
                  ? Number(
                      item.height,
                    )
                  : null,
            },
          }),
        ),
      },

      // ------------------------------------------------------
      // FULFILLMENT GROUPS
      // ------------------------------------------------------

      fulfillmentGroups:
        payload.fulfillmentGroups ||
        null,

      // ------------------------------------------------------
      // ORDER ITEMS
      // ------------------------------------------------------

      items: {
        create: cart.items.map(
          (cartItem) => {
            const itemCBM =
              calculatedItems.find(
                (item) =>
                  item.variantId ===
                  cartItem.variantId,
              );

            return {
              variantId:
                cartItem.variantId,

              quantity:
                Number(
                  cartItem.quantity,
                ),

              unitPriceSnapshot:
                cartItem.unitPriceSnapshot,

              totalPrice:
                Number(
                  cartItem.unitPriceSnapshot,
                ) *
                Number(
                  cartItem.quantity,
                ),

              cbm:
                Number(
                  itemCBM?.cbm || 0,
                ),

              chargeableWeight:
                Number(
                  itemCBM?.chargeableWeight ||
                    0,
                ),
            };
          },
        ),
      },
    },
  });
};

// ============================================================
// ORDERS LIST
// ============================================================

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
    ...(status && {
      status,
    }),

    ...(userId && {
      userId,
    }),

    ...(search && {
      OR: [
        {
          orderNumber: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          customerName: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          customerEmail: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          customerPhone: {
            contains: search,
            mode: "insensitive",
          },
        },
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
                media: {
                  select:
                    variantMediaSelect,
                },

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

    prisma.order.count({
      where,
    }),
  ]);
};

// ============================================================
// SINGLE ORDER
// ============================================================

export const findOrderById = async (
  id,
  tx = prisma,
) => {
  return tx.order.findUnique({
    where: {
      id,
    },

    include: orderInclude,
  });
};

export const findOrderByOrderNumber = async (
  orderNumber,
  tx = prisma,
) => {
  return tx.order.findUnique({
    where: {
      orderNumber,
    },

    include: orderInclude,
  });
};

// ============================================================
// ORDER STATUS
// ============================================================

export const updateOrderStatus = async (
  id,
  status,
  tx = prisma,
) => {
  return tx.order.update({
    where: {
      id,
    },

    data: {
      status,
    },

    include: orderInclude,
  });
};

export const updateOrderStatusTx = async (
  id,
  data,
  tx = prisma,
) => {
  return tx.order.update({
    where: {
      id,
    },

    data,

    include: orderInclude,
  });
};

// ============================================================
// STOCK
// ============================================================

export const decrementVariantStock = async (
  {
    variantId,
    quantity,
  },
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
  {
    variantId,
    quantity,
  },
  tx = prisma,
) => {
  return tx.productVariant.update({
    where: {
      id: variantId,
    },

    data: {
      stock: {
        increment: quantity,
      },
    },
  });
};

// ============================================================
// ORDER CBM
// ============================================================

export const updateOrderCBM = async (
  id,
  data,
  tx = prisma,
) => {
  return tx.order.update({
    where: {
      id,
    },

    data: {
      cbm: data.cbm,

      chargeableWeight:
        data.chargeableWeight,

      cbmData:
        data.cbmData,

      cbmUpdatedAt:
        data.cbmUpdatedAt ||
        new Date(),

      cbmUpdatedBy:
        data.cbmUpdatedBy ||
        null,
    },

    include: orderInclude,
  });
};

// ============================================================
// ORDER METRICS
// ============================================================

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

    prisma.order.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.order.count({
      where: {
        status: "PROCESSING",
      },
    }),

    prisma.order.count({
      where: {
        status: "COMPLETED",
      },
    }),

    prisma.order.count({
      where: {
        status: "CANCELLED",
      },
    }),

    prisma.order.aggregate({
      where: {
        status: "COMPLETED",
      },

      _sum: {
        totalAmount: true,
      },
    }),

    prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(
            new Date().setHours(
              0,
              0,
              0,
              0,
            ),
          ),
        },
      },
    }),

    prisma.order.aggregate({
      where: {
        status: "COMPLETED",

        createdAt: {
          gte: new Date(
            new Date().setHours(
              0,
              0,
              0,
              0,
            ),
          ),
        },
      },

      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  return {
    totalOrders,

    pendingOrders,

    processingOrders,

    completedOrders,

    cancelledOrders,

    totalRevenue:
      totalRevenue._sum.totalAmount ||
      0,

    todayOrders,

    todayRevenue:
      todayRevenue._sum.totalAmount ||
      0,
  };
};

// ============================================================
// ORDER TIMELINE - AUDIT
// ============================================================

export const findOrderAuditLogs = async (
  orderId,
  tx = prisma,
) => {
  return tx.auditLog.findMany({
    where: {
      entity: "Order",
      entityId: orderId,
      action: "ORDER_STATUS_CHANGE",
    },

    orderBy: {
      createdAt: "asc",
    },
  });
};

// ============================================================
// ORDER TIMELINE - PAYMENTS
// ============================================================

export const findOrderPayments = async (
  orderId,
  tx = prisma,
) => {
  return tx.payment.findMany({
    where: {
      orderId,
    },

    orderBy: {
      createdAt: "asc",
    },
  });
};

// ============================================================
// ORDER TIMELINE - FULFILLMENTS
// ============================================================

export const findOrderFulfillments = async (
  orderId,
  tx = prisma,
) => {
  return tx.fulfillment.findMany({
    where: {
      orderId,
    },

    include: {
      items: true,
    },

    orderBy: {
      createdAt: "asc",
    },
  });
};

// ============================================================
// ORDERS BY FULFILLMENT TYPE
// ============================================================

export const findOrdersByFulfillmentType =
  async (
    fulfillmentType,
    tx = prisma,
  ) => {
    return tx.order.findMany({
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
                media: {
                  select:
                    variantMediaSelect,
                },

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
