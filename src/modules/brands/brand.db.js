// modules/brands/brand.db.js
import { prisma } from "../../config/prisma.js";

export const createBrand = (data) => {
  return prisma.brand.create({ data });
};

export const findBrandById = (id) => {
  return prisma.brand.findUnique({
    where: { id },
    include: {
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
        _count: {
          select: { products: true },
        },
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
  });
};

export const deleteBrand = (id) => {
  return prisma.brand.delete({
    where: { id },
  });
};// modules/brands/brand.db.js
import { prisma } from "../../config/prisma.js";

export const createBrand = (data) => {
  return prisma.brand.create({ data });
};

export const findBrandById = (id) => {
  return prisma.brand.findUnique({
    where: { id },
    include: {
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
        _count: {
          select: { products: true },
        },
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
  });
};

export const deleteBrand = (id) => {
  return prisma.brand.delete({
    where: { id },
  });
};