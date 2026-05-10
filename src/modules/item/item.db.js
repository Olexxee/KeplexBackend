import { prisma } from "../../config/prisma.js";

const itemInclude = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
    },
  },

  media: {
    orderBy: {
      sortOrder: "asc",
    },
  },
};

export const createItem = async (data) => {
  const { images = [], ...itemData } = data;

  return prisma.item.create({
    data: {
      ...itemData,

      media: {
        create: images.map((image, index) => ({
          url: image.url,
          publicId: image.publicId,

          width: image.width,
          height: image.height,

          bytes: image.bytes,
          format: image.format,
          mimeType: image.mimeType,

          isPrimary: index === 0,
          sortOrder: index,
        })),
      },
    },

    include: itemInclude,
  });
};

export const findItemById = async (id) => {
  return prisma.item.findUnique({
    where: { id },
    include: itemInclude,
  });
};

export const findItemBySlug = async (slug) => {
  return prisma.item.findUnique({
    where: { slug },

    include: itemInclude,
  });
};

export const findItemBySku = async (sku) => {
  return prisma.item.findUnique({
    where: { sku },

    include: itemInclude,
  });
};

export const findItems = async ({ categoryId, status, itemType, search }) => {
  return prisma.item.findMany({
    where: {
      ...(categoryId && { categoryId }),

      ...(status && { status }),

      ...(itemType && { itemType }),

      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },

          {
            description: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      }),
    },

    include: itemInclude,

    orderBy: {
      createdAt: "desc",
    },
  });
};

export const updateItem = async (id, data) => {
  const { images, ...itemData } = data;

  return prisma.$transaction(async (tx) => {
    if (Array.isArray(images) && images.length > 0) {
      await tx.media.deleteMany({
        where: {
          itemId: id,
        },
      });
    }

    return tx.item.update({
      where: { id },

      data: {
        ...itemData,

        ...(Array.isArray(images) &&
          images.length > 0 && {
            media: {
              create: images.map((image, index) => ({
                url: image.url,
                publicId: image.publicId,

                width: image.width,
                height: image.height,

                bytes: image.bytes,
                format: image.format,
                mimeType: image.mimeType,

                isPrimary: index === 0,
                sortOrder: index,
              })),
            },
          }),
      },

      include: itemInclude,
    });
  });
};

export const deleteItem = async (id) => {
  return prisma.item.delete({
    where: { id },

    include: {
      media: true,
    },
  });
};
