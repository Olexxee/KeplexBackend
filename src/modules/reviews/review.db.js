import { prisma } from "../../config/prisma.js";

const reviewInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
    },
  },
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
  responses: {
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
};

export const createReview = async (data) => {
  return prisma.review.create({
    data,
    include: reviewInclude,
  });
};

export const findReviewById = async (id) => {
  return prisma.review.findUnique({
    where: { id },
    include: reviewInclude,
  });
};

export const findReviewsByVariant = async (
  variantId,
  { skip = 0, take = 10, status = "APPROVED" } = {},
) => {
  const where = {
    variantId,
    status,
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: reviewInclude,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.count({ where }),
  ]);

  return { reviews, total };
};

export const findReviewsByUser = async (
  userId,
  { skip = 0, take = 10 } = {},
) => {
  const where = { userId };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: reviewInclude,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.count({ where }),
  ]);

  return { reviews, total };
};

export const findReviews = async ({
  variantId,
  userId,
  status,
  search,
  startDate,
  endDate,
  skip = 0,
  take = 20,
} = {}) => {
  const where = {
    ...(variantId && { variantId }),
    ...(userId && { userId }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { comment: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(startDate && {
      createdAt: { gte: new Date(startDate) },
    }),
    ...(endDate && {
      createdAt: { lte: new Date(endDate) },
    }),
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: reviewInclude,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.count({ where }),
  ]);

  return { reviews, total };
};

export const updateReview = async (id, data) => {
  return prisma.review.update({
    where: { id },
    data,
    include: reviewInclude,
  });
};

export const deleteReview = async (id) => {
  return prisma.review.delete({
    where: { id },
  });
};

export const getVariantReviewStats = async (variantId) => {
  const reviews = await prisma.review.findMany({
    where: {
      variantId,
      status: "APPROVED",
    },
    select: {
      rating: true,
    },
  });

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const total = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
  });

  return {
    averageRating: parseFloat((sum / total).toFixed(1)),
    totalReviews: total,
    ratingDistribution: distribution,
  };
};

export const updateReviewHelpfulness = async (id, increment = true) => {
  return prisma.review.update({
    where: { id },
    data: {
      helpfulCount: {
        increment: increment ? 1 : 0,
      },
    },
  });
};

export const createReviewResponse = async (data) => {
  return prisma.reviewResponse.create({
    data,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });
};

export const findReviewResponseById = async (id) => {
  return prisma.reviewResponse.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });
};

export const deleteReviewResponse = async (id) => {
  return prisma.reviewResponse.delete({
    where: { id },
  });
};
