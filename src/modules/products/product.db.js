// modules/products/product.db.js
import { prisma } from "../../config/prisma.js";

const productInclude = {
  brand: {
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
    },
  },
  collection: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  variants: {
    include: {
      cartItems: true,
      orderItems: true,
      wishlists: true,
      reviews: {
        where: {
          status: "APPROVED",
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          helpfulCount: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      },
    },
  },
  _count: {
    select: {
      variants: true,
      reviews: true,
    },
  },
};

export const createProduct = (data, tx = prisma) => {
  return tx.product.create({
    data,
    include: productInclude,
  });
};

export const findProductById = (id, tx = prisma) => {
  return tx.product.findUnique({
    where: { id },
    include: productInclude,
  });
};

export const findProductBySlug = (slug, tx = prisma) => {
  return tx.product.findUnique({
    where: { slug },
    include: productInclude,
  });
};

export const findProducts = async (
  {
    categoryId,
    brandId,
    collectionId,
    status,
    isFeatured,
    isNew,
    isBestSeller,
    minPrice,
    maxPrice,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
    skip = 0,
    take = 20,
    includeVariants = true,
  } = {},
  tx = prisma,
) => {
  const where = {
    ...(categoryId && { categoryId }),
    ...(brandId && { brandId }),
    ...(collectionId && { collectionId }),
    ...(status && { status }),
    ...(typeof isFeatured === "boolean" && { isFeatured }),
    ...(typeof isNew === "boolean" && { isNew }),
    ...(typeof isBestSeller === "boolean" && { isBestSeller }),
    ...(minPrice !== undefined && {
      variants: {
        some: {
          price: { gte: minPrice },
        },
      },
    }),
    ...(maxPrice !== undefined && {
      variants: {
        some: {
          price: { lte: maxPrice },
        },
      },
    }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        {
          variants: {
            some: {
              sku: { contains: search, mode: "insensitive" },
            },
          },
        },
      ],
    }),
  };

  const orderBy = {
    [sortBy]: sortOrder,
  };

  let include = {
    brand: {
      select: { id: true, name: true, slug: true },
    },
    category: {
      select: { id: true, name: true, slug: true },
    },
    collection: {
      select: { id: true, name: true, slug: true },
    },
    _count: {
      select: {
        variants: true,
        reviews: true,
      },
    },
  };

  if (includeVariants) {
    include = {
      ...include,
      variants: {
        where: { isActive: true },
        include: {
          reviews: {
            where: { status: "APPROVED" },
            select: {
              rating: true,
            },
          },
        },
      },
    };
  }

  const [products, total] = await Promise.all([
    tx.product.findMany({
      where,
      include,
      skip,
      take,
      orderBy,
    }),
    tx.product.count({ where }),
  ]);

  const productsWithRating = products.map((product) => {
    const allRatings =
      product.variants?.flatMap((v) => v.reviews?.map((r) => r.rating) || []) ||
      [];

    const avgRating =
      allRatings.length > 0
        ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
        : 0;

    const lowestPrice =
      product.variants?.length > 0
        ? Math.min(...product.variants.map((v) => Number(v.price)))
        : null;

    const highestPrice =
      product.variants?.length > 0
        ? Math.max(...product.variants.map((v) => Number(v.price)))
        : null;

    return {
      ...product,
      avgRating: parseFloat(avgRating.toFixed(1)),
      priceRange: {
        min: lowestPrice,
        max: highestPrice,
      },
      totalReviews: allRatings.length,
    };
  });

  return {
    products: productsWithRating,
    total,
  };
};

export const findFeaturedProducts = (
  { limit = 10, categoryId } = {},
  tx = prisma,
) => {
  const where = {
    isFeatured: true,
    status: "ACTIVE",
    ...(categoryId && { categoryId }),
  };

  return tx.product.findMany({
    where,
    include: {
      brand: {
        select: { id: true, name: true, slug: true },
      },
      category: {
        select: { id: true, name: true, slug: true },
      },
      variants: {
        where: { isActive: true },
        take: 1,
      },
      _count: {
        select: {
          variants: true,
          reviews: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};

export const findNewArrivals = (
  { limit = 10, categoryId } = {},
  tx = prisma,
) => {
  const where = {
    isNew: true,
    status: "ACTIVE",
    ...(categoryId && { categoryId }),
  };

  return tx.product.findMany({
    where,
    include: {
      brand: {
        select: { id: true, name: true, slug: true },
      },
      category: {
        select: { id: true, name: true, slug: true },
      },
      variants: {
        where: { isActive: true },
        take: 1,
      },
      _count: {
        select: {
          variants: true,
          reviews: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};

export const findBestSellers = (
  { limit = 10, categoryId } = {},
  tx = prisma,
) => {
  const where = {
    isBestSeller: true,
    status: "ACTIVE",
    ...(categoryId && { categoryId }),
  };

  return tx.product.findMany({
    where,
    include: {
      brand: {
        select: { id: true, name: true, slug: true },
      },
      category: {
        select: { id: true, name: true, slug: true },
      },
      variants: {
        where: { isActive: true },
        take: 1,
      },
      _count: {
        select: {
          variants: true,
          reviews: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};

export const updateProduct = (id, data, tx = prisma) => {
  return tx.product.update({
    where: { id },
    data,
    include: productInclude,
  });
};

export const deleteProduct = (id, tx = prisma) => {
  return tx.product.delete({
    where: { id },
    include: {
      variants: true,
    },
  });
};

export const updateProductStatus = (id, status, tx = prisma) => {
  return tx.product.update({
    where: { id },
    data: { status },
    include: productInclude,
  });
};

export const getProductVariants = (productId, tx = prisma) => {
  return tx.productVariant.findMany({
    where: { productId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      cartItems: true,
      orderItems: true,
      wishlists: true,
      reviews: {
        where: { status: "APPROVED" },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getRelatedProducts = (productId, limit = 6, tx = prisma) => {
  return tx.product
    .findUnique({
      where: { id: productId },
      select: {
        categoryId: true,
        brandId: true,
      },
    })
    .then((product) => {
      if (!product) return [];

      return tx.product.findMany({
        where: {
          id: { not: productId },
          status: "ACTIVE",
          OR: [
            { categoryId: product.categoryId },
            { brandId: product.brandId },
          ],
        },
        include: {
          brand: {
            select: { id: true, name: true, slug: true },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
          variants: {
            where: { isActive: true },
            take: 1,
          },
          _count: {
            select: {
              variants: true,
              reviews: true,
            },
          },
        },
        take: limit,
      });
    });
};
