import { prisma } from "../../config/prisma.js";

export const getOrderStatusCounts = async () => {
  return prisma.order.groupBy({
    by: ["status"],
    _count: { status: true },
  });
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
    where: { status: "PENDING" },
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
    },
  });
};

export const getRecentOrders = async () => {
  return prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      items: true,
    },
  });
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
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });
};

export const getTopItems = async () => {
  return prisma.orderItem.groupBy({
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
};

export const getItemsByIds = async (ids) => {
  return prisma.item.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    include: {
      media: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
      category: true,
    },
  });
};

export const getBasicCounts = async () => {
  const [users, categories, items, orders] = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.item.count(),
    prisma.order.count(),
  ]);

  return {
    users,
    categories,
    items,
    orders,
  };
};
