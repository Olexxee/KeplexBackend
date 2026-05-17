import {prisma} from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

export const createTestimonial = async (data, tx = null) => {
  const db = dbClient(tx);

  return db.testimonial.create({
    data,
  });
};

export const findTestimonialById = async (id, tx = null) => {
  const db = dbClient(tx);

  return db.testimonial.findUnique({
    where: { id },
  });
};

export const updateTestimonialById = async (id, data, tx = null) => {
  const db = dbClient(tx);

  return db.testimonial.update({
    where: { id },
    data,
  });
};

export const deleteTestimonialById = async (id, tx = null) => {
  const db = dbClient(tx);

  return db.testimonial.delete({
    where: { id },
  });
};

export const listPublicTestimonials = async () => {
  return prisma.testimonial.findMany({
    where: {
      status: "APPROVED",
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const listAdminTestimonials = async ({
  page = 1,
  limit = 20,
  search,
  status,
} = {}) => {
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    ...(status ? { status } : {}),

    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },

            {
              role: {
                contains: search,
                mode: "insensitive",
              },
            },

            {
              message: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.testimonial.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: Number(limit),
    }),

    prisma.testimonial.count({
      where,
    }),
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

export const getTestimonialStats = async () => {
  const [total, approved, pending, rejected] = await Promise.all([
    prisma.testimonial.count(),

    prisma.testimonial.count({
      where: { status: "APPROVED" },
    }),

    prisma.testimonial.count({
      where: { status: "PENDING" },
    }),

    prisma.testimonial.count({
      where: { status: "REJECTED" },
    }),
  ]);

  return {
    total,
    approved,
    pending,
    rejected,
  };
};
