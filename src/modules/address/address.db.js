import { prisma } from "../../config/prisma.js";

export const getAddressesByUser = (userId) => {
  return prisma.address.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

export const findAddressById = (id) => {
  return prisma.address.findUnique({
    where: { id },
  });
};

export const createAddress = (data) => {
  return prisma.address.create({ data });
};

export const updateAddress = (id, data) => {
  return prisma.address.update({
    where: { id },
    data,
  });
  a;
};

export const deleteAddress = (id) => {
  return prisma.address.delete({
    where: { id },
  });
};

export const setDefaultAddress = async (userId, addressId) => {
  const address = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId,
    },
  });

  if (!address) {
    throw new NotFoundError("Address not found");
  }

  await prisma.$transaction([
    prisma.address.updateMany({
      where: {
        userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    }),

    prisma.address.update({
      where: {
        id: addressId,
      },
      data: {
        isDefault: true,
      },
    }),
  ]);
};

export const clearDefaultAddresses = (userId) => {
  return prisma.address.updateMany({
    where: {
      userId,
      isDefault: true,
    },
    data: {
      isDefault: false,
    },
  });
};