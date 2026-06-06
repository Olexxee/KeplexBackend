import { prisma } from "../../config/prisma.js";

export const getOrderStatusCounts = async () => {
  const results = await prisma.order.groupBy({
    by: ["status"],
    _count: {
      status: true,
    },
  });

  return results.map((row) => ({
    status: row.status,
    _count: {
      status: row._count.status,
    },
  }));
};

export const getRevenueStats = async () => {
  return prisma.order.aggregate({
    where: {
      status: {
        in: ["CONFIRMED", "PROCESSING", "COMPLETED"],
      },
    },
    _sum: {
      totalAmount: true,
    },
    _count: {
      id: true,
    },
  });
};

export const getPendingOrders = async () => {
  return prisma.order.findMany({
    where: {
      status: "PENDING",
    },
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      items: {
        include: {
          item: true,
        },
      },
    },
  });
};

export const getRecentOrders = async () => {
  return prisma.order.findMany({
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      items: {
        include: {
          item: true,
        },
      },
    },
  });
};

export const getPaymentStats = async () => {
  const results = await prisma.payment.groupBy({
    by: ["status"],
    _count: {
      status: true,
    },
    _sum: {
      amount: true,
    },
  });

  return results.map((row) => ({
    status: row.status,
    _count: {
      status: row._count.status,
    },
    _sum: {
      amount: row._sum.amount || 0,
    },
  }));
};

// Fixed: Use TrainingRegistration instead of Registration
export const getRegistrationStatusCounts = async () => {
  const results = await prisma.trainingRegistration.groupBy({
    by: ["status"],
    _count: {
      status: true,
    },
  });

  return results.map((row) => ({
    status: row.status,
    _count: {
      status: row._count.status,
    },
  }));
};

export const getLowStockItems = async () => {
  return prisma.item.findMany({
    where: {
      itemType: "PRODUCT",
      status: "ACTIVE",
      stock: {
        lte: 5,
      },
    },
    take: 10,
    orderBy: {
      stock: "asc",
    },
    include: {
      category: true,
      media: {
        take: 1,
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });
};

export const getTopItems = async () => {
  const results = await prisma.orderItem.groupBy({
    by: ["itemId"],
    _sum: {
      quantity: true,
      totalPrice: true,
    },
    orderBy: {
      _sum: {
        quantity: "desc",
      },
    },
    take: 10,
  });

  return results.map((row) => ({
    itemId: row.itemId,
    _sum: {
      quantity: row._sum.quantity || 0,
      totalPrice: row._sum.totalPrice || 0,
    },
  }));
};

export const getItemsByIds = async (ids) => {
  if (!ids.length) return [];

  return prisma.item.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    include: {
      media: {
        take: 1,
        orderBy: {
          sortOrder: "asc",
        },
      },
      category: true,
    },
  });
};

export const getBasicCounts = async () => {
  const [users, categories, items, orders, registrations] = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.item.count(),
    prisma.order.count(),
    prisma.trainingRegistration.count(), 
  ]);

  return {
    users,
    categories,
    items,
    orders,
    registrations,
  };
};
