import{ prisma} from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

export const createRegistration = async (data, tx = null) => {
  const db = dbClient(tx);

  return db.trainingRegistration.create({
    data,
  });
};

export const findRegistrationById = async (id, tx = null) => {
  const db = dbClient(tx);

  return db.trainingRegistration.findUnique({
    where: { id },
  });
};

export const findRegistrationByPaymentRef = async (paymentRef, tx = null) => {
  const db = dbClient(tx);

  return db.trainingRegistration.findUnique({
    where: { paymentRef },
  });
};

export const updateRegistrationById = async (id, data, tx = null) => {
  const db = dbClient(tx);

  return db.trainingRegistration.update({
    where: { id },
    data,
  });
};

export const updateRegistrationByPaymentRef = async (
  paymentRef,
  data,
  tx = null,
) => {
  const db = dbClient(tx);

  return db.trainingRegistration.update({
    where: { paymentRef },
    data,
  });
};

export const listRegistrations = async ({
  page = 1,
  limit = 20,
  search,
  status,
  from,
  to,
} = {}) => {
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    ...(status ? { status } : {}),

    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { paymentRef: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),

    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.trainingRegistration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),

    prisma.trainingRegistration.count({ where }),
  ]);

  return {
    items,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

export const getRegistrationStats = async () => {
  const [total, pending, paid, cancelled, expired] = await Promise.all([
    prisma.trainingRegistration.count(),
    prisma.trainingRegistration.count({ where: { status: "PENDING" } }),
    prisma.trainingRegistration.count({ where: { status: "PAID" } }),
    prisma.trainingRegistration.count({ where: { status: "CANCELLED" } }),
    prisma.trainingRegistration.count({ where: { status: "EXPIRED" } }),
  ]);

  return {
    total,
    pending,
    paid,
    cancelled,
    expired,
  };
};