import { prisma } from "../../config/prisma.js";

const mediaOrderBy = [{ isPrimary: "desc" }, { sortOrder: "asc" }];

export const createBrand = (data, mediaData) => {
  return prisma.brand.create({
    data: {
      ...data,
      ...(mediaData && { media: { create: mediaData } }),
    },
    include: { media: { orderBy: mediaOrderBy } },
  });
};

export const findBrandById = (id) => {
  return prisma.brand.findUnique({
    where: { id },
    include: {
      media: { orderBy: mediaOrderBy },
      products: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          slug: true,
          variants: {
            where: { isActive: true },
            take: 1,
          },
        },
      },
    },
  });
};

export const findBrandBySlug = (slug) => {
  return prisma.brand.findUnique({
    where: { slug },
    include: {
      media: { orderBy: mediaOrderBy },
      products: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
};

export const findBrands = ({ isActive, search, skip = 0, take = 20 } = {}) => {
  const where = {
    ...(typeof isActive === "boolean" && { isActive }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  return Promise.all([
    prisma.brand.findMany({
      where,
      include: {
        media: { where: { isPrimary: true }, take: 1 },
        _count: { select: { products: true } },
      },
      skip,
      take,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.brand.count({ where }),
  ]);
};

export const updateBrand = (id, data) => {
  return prisma.brand.update({
    where: { id },
    data,
    include: { media: { orderBy: mediaOrderBy } },
  });
};

export const deleteBrandMedia = (brandId) => {
  return prisma.brandMedia.deleteMany({ where: { brandId } });
};

export const createBrandMedia = (brandId, mediaData) => {
  return prisma.brandMedia.create({
    data: { ...mediaData, brandId },
  });
};

export const deleteBrand = (id) => {
  return prisma.brand.delete({ where: { id } });
};
