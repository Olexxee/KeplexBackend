import { prisma } from "../../config/prisma.js";

// ============================================================
// SHARED SELECTS / INCLUDES
// ============================================================

const reviewImageSelect = {
  id: true,
  url: true,
  publicId: true,
  mimeType: true,
  bytes: true,
  format: true,
  width: true,
  height: true,
  sortOrder: true,
  createdAt: true,
};

const reviewUserSelect = {
  id: true,
  fullName: true,
};

const reviewInclude = {
  user: {
    select: reviewUserSelect,
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

  images: {
    select: reviewImageSelect,
    orderBy: {
      sortOrder: "asc",
    },
  },

  responses: {
    include: {
      user: {
        select: reviewUserSelect,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
};

// ============================================================
// REVIEWS
// ============================================================

export const createReview = async (data, tx = prisma) =>
  tx.review.create({
    data,
    include: reviewInclude,
  });

export const findReviewById = async (id, tx = prisma) =>
  tx.review.findUnique({
    where: { id },
    include: reviewInclude,
  });

export const findReviewByUserAndVariant = async (
  userId,
  variantId,
  tx = prisma,
) =>
  tx.review.findUnique({
    where: {
      userId_variantId: {
        userId,
        variantId,
      },
    },
    include: reviewInclude,
  });

export const findReviewsByVariant = async (
  variantId,
  { skip = 0, take = 10, status = "APPROVED" } = {},
  tx = prisma,
) => {
  const where = {
    variantId,
    status,
  };

  const [reviews, total] = await Promise.all([
    tx.review.findMany({
      where,
      include: reviewInclude,
      skip,
      take,
      orderBy: {
        createdAt: "desc",
      },
    }),

    tx.review.count({
      where,
    }),
  ]);

  return {
    reviews,
    total,
  };
};

export const findReviewsByUser = async (
  userId,
  { skip = 0, take = 10 } = {},
  tx = prisma,
) => {
  const where = {
    userId,
  };

  const [reviews, total] = await Promise.all([
    tx.review.findMany({
      where,
      include: reviewInclude,
      skip,
      take,
      orderBy: {
        createdAt: "desc",
      },
    }),

    tx.review.count({
      where,
    }),
  ]);

  return {
    reviews,
    total,
  };
};

export const findReviews = async (
  {
    variantId,
    userId,
    status,
    search,
    startDate,
    endDate,
    skip = 0,
    take = 20,
  } = {},
  tx = prisma,
) => {
  const where = {
    ...(variantId && { variantId }),
    ...(userId && { userId }),
    ...(status && { status }),

    ...(search && {
      OR: [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          comment: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    }),

    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate && {
              gte: new Date(startDate),
            }),
            ...(endDate && {
              lte: new Date(endDate),
            }),
          },
        }
      : {}),
  };

  const [reviews, total] = await Promise.all([
    tx.review.findMany({
      where,
      include: reviewInclude,
      skip,
      take,
      orderBy: {
        createdAt: "desc",
      },
    }),

    tx.review.count({
      where,
    }),
  ]);

  return {
    reviews,
    total,
  };
};

export const updateReview = async (id, data, tx = prisma) =>
  tx.review.update({
    where: { id },
    data,
    include: reviewInclude,
  });

export const deleteReview = async (id, tx = prisma) =>
  tx.review.delete({
    where: { id },
  });

// ============================================================
// REVIEW IMAGES
// ============================================================

export const createReviewImage = async (data, tx = prisma) =>
  tx.reviewImage.create({
    data,
    select: reviewImageSelect,
  });

export const createReviewImages = async (data, tx = prisma) =>
  tx.reviewImage.createMany({
    data,
  });

export const findReviewImageById = async (id, tx = prisma) =>
  tx.reviewImage.findUnique({
    where: { id },
    select: reviewImageSelect,
  });

export const findReviewImagesByReview = async (reviewId, tx = prisma) =>
  tx.reviewImage.findMany({
    where: { reviewId },
    select: reviewImageSelect,
    orderBy: {
      sortOrder: "asc",
    },
  });

export const deleteReviewImage = async (id, tx = prisma) =>
  tx.reviewImage.delete({
    where: { id },
  });

export const deleteReviewImagesByReview = async (reviewId, tx = prisma) =>
  tx.reviewImage.deleteMany({
    where: { reviewId },
  });

// ============================================================
// REVIEW STATS
// ============================================================

export const getVariantReviewStats = async (variantId, tx = prisma) => {
  const reviews = await tx.review.findMany({
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
      ratingDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    };
  }

  const total = reviews.length;

  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);

  const distribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  reviews.forEach((review) => {
    distribution[review.rating] += 1;
  });

  return {
    averageRating: parseFloat((sum / total).toFixed(1)),
    totalReviews: total,
    ratingDistribution: distribution,
  };
};

// ============================================================
// HELPFUL
// ============================================================

export const updateReviewHelpfulness = async (
  id,
  increment = true,
  tx = prisma,
) =>
  tx.review.update({
    where: { id },
    data: {
      helpfulCount: {
        increment: increment ? 1 : 0,
      },
    },
  });

// ============================================================
// REVIEW RESPONSES
// ============================================================

export const createReviewResponse = async (data, tx = prisma) =>
  tx.reviewResponse.create({
    data,
    include: {
      user: {
        select: reviewUserSelect,
      },
    },
  });

export const findReviewResponseById = async (id, tx = prisma) =>
  tx.reviewResponse.findUnique({
    where: { id },
    include: {
      user: {
        select: reviewUserSelect,
      },
    },
  });

export const deleteReviewResponse = async (id, tx = prisma) =>
  tx.reviewResponse.delete({
    where: { id },
  });
