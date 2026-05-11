import * as dashboardDb from "./dashboard.db.js";

const toNumber = (value) => Number(value || 0);

const normalizeStatusCounts = (rows) => {
  const base = {
    PENDING: 0,
    CONFIRMED: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  for (const row of rows) {
    base[row.status] = row._count.status;
  }

  return base;
};

export const getDashboardOverview = async () => {
  const [
    basicCounts,
    orderStatusCounts,
    revenueStats,
    pendingOrders,
    recentOrders,
    lowStockItems,
    topItemRows,
  ] = await Promise.all([
    dashboardDb.getBasicCounts(),
    dashboardDb.getOrderStatusCounts(),
    dashboardDb.getRevenueStats(),
    dashboardDb.getPendingOrders(),
    dashboardDb.getRecentOrders(),
    dashboardDb.getLowStockItems(),
    dashboardDb.getTopItems(),
  ]);

  const topItemIds = topItemRows.map((row) => row.itemId);
  const topItems = await dashboardDb.getItemsByIds(topItemIds);

  const topItemsMap = new Map(topItems.map((item) => [item.id, item]));

  return {
    counts: basicCounts,

    revenue: {
      totalRevenue: toNumber(revenueStats._sum.totalAmount),
      paidOrderCount: revenueStats._count.id,
    },

    orders: {
      statusCounts: normalizeStatusCounts(orderStatusCounts),
      pending: pendingOrders,
      recent: recentOrders,
    },

    inventory: {
      lowStockItems,
    },

    topItems: topItemRows.map((row) => ({
      item: topItemsMap.get(row.itemId) || null,
      quantitySold: row._sum.quantity || 0,
      revenue: toNumber(row._sum.totalPrice),
    })),
  };
};
