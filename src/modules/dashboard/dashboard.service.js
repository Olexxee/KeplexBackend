import * as dashboardDb from "./dashboard.db.js";

const toNumber = (value) => Number(value || 0);

const normalizeCounts = (rows, defaults) => {
  const result = { ...defaults };

  if (rows && Array.isArray(rows)) {
    rows.forEach((row) => {
      if (row?.status && row?._count?.status !== undefined) {
        result[row.status] = row._count.status;
      }
    });
  }

  return result;
};

export const getDashboardOverview = async () => {
  const [
    basicCounts,
    orderStatusRows,
    registrationStatusRows,
    paymentRows,
    pendingOrders,
    recentOrders,
    lowStockItems,
    topItemRows,
  ] = await Promise.all([
    dashboardDb.getBasicCounts(),
    dashboardDb.getOrderStatusCounts(),
    dashboardDb.getRegistrationStatusCounts(),
    dashboardDb.getPaymentStats(),
    dashboardDb.getPendingOrders(),
    dashboardDb.getRecentOrders(),
    dashboardDb.getLowStockItems(),
    dashboardDb.getTopItems(),
  ]);

  // Calculate successful payments and revenue
  const successfulPayments =
    paymentRows?.filter((row) => row?.status === "SUCCESS") || [];

  const totalRevenue = successfulPayments.reduce(
    (sum, row) => sum + toNumber(row?._sum?.amount),
    0,
  );

  // Get top items data
  const topItemIds =
    topItemRows?.map((row) => row.itemId).filter(Boolean) || [];

  const topItemsData =
    topItemIds.length > 0 ? await dashboardDb.getItemsByIds(topItemIds) : [];

  const itemMap = new Map(topItemsData.map((item) => [item.id, item]));

  return {
    metrics: {
      users: basicCounts?.users || 0,
      categories: basicCounts?.categories || 0,
      items: basicCounts?.items || 0,
      orders: basicCounts?.orders || 0,
      registrations: basicCounts?.registrations || 0,
    },

    revenue: {
      totalRevenue,
      successfulPayments: successfulPayments.reduce(
        (sum, row) => sum + (row?._count?.status || 0),
        0,
      ),
    },

    orders: {
      statusCounts: normalizeCounts(orderStatusRows, {
        PENDING: 0,
        CONFIRMED: 0,
        PROCESSING: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      }),
      pending: pendingOrders || [],
      recent: recentOrders || [],
    },

    registrations: {
      statusCounts: normalizeCounts(registrationStatusRows, {
        PENDING: 0,
        PAID: 0,
        CANCELLED: 0,
        EXPIRED: 0,
      }),
    },

    payments: {
      statusCounts: normalizeCounts(paymentRows, {
        PENDING: 0,
        SUCCESS: 0,
        FAILED: 0,
        REVERSED: 0,
      }),
    },

    inventory: {
      lowStockItems: lowStockItems || [],
    },

    topItems:
      topItemRows?.map((row) => ({
        item: itemMap.get(row.itemId) || null,
        quantitySold: row?._sum?.quantity || 0,
        revenue: toNumber(row?._sum?.totalPrice),
      })) || [],
  };
};
