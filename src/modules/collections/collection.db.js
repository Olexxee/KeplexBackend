// modules/collections/collection.db.js
import { prisma } from "../../config/prisma.js";

export const createCollection = (data) => {
  return prisma.collection.create({ data });
};

export const findCollectionById = (id) => {
  return prisma.collection.findUnique({
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

export const findCollectionBySlug = (slug) => {
  return prisma.collection.findUnique({
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

export const findCollections = ({
  isActive,
  search,
  skip = 0,
  take = 20,
} = {}) => {
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
    prisma.collection.findMany({
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
    prisma.collection.count({ where }),
  ]);
};

export const updateCollection = (id, data) => {
  return prisma.collection.update({
    where: { id },
    data,
  });
};

export const deleteCollection = (id) => {
  return prisma.collection.delete({
    where: { id },
  });
};
