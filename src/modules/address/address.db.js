import { prisma } from "../../config/prisma.js";
import { NotFoundError } from "../../classes/errorClasses.js";

export const getAddressesByUser = (userId, tx = prisma) => {
  return tx.address.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const countAddressesByUser = (userId, tx = prisma) => {
  return tx.address.count({
    where: {
      userId,
    },
  });
};

export const findAddressById = (id, tx = prisma) => {
  return tx.address.findUnique({
    where: {
      id,
    },
  });
};

export const findAddressByUser = (userId, id, tx = prisma) => {
  return tx.address.findFirst({
    where: {
      id,
      userId,
    },
  });
};

export const createAddress = (data, tx = prisma) => {
  return tx.address.create({
    data,
  });
};

export const updateAddress = (id, data, tx = prisma) => {
  return tx.address.update({
    where: {
      id,
    },
    data,
  });
};

export const deleteAddress = (id, tx = prisma) => {
  return tx.address.delete({
    where: {
      id,
    },
  });
};

export const clearDefaultAddresses = (userId, tx = prisma) => {
  return tx.address.updateMany({
    where: {
      userId,
      isDefault: true,
    },
    data: {
      isDefault: false,
    },
  });
};

export const setDefaultAddress = async (userId, addressId, tx = prisma) => {
  const address = await findAddressByUser(userId, addressId, tx);

  if (!address) {
    throw new NotFoundError("Address not found");
  }

  await clearDefaultAddresses(userId, tx);

  return tx.address.update({
    where: {
      id: addressId,
    },
    data: {
      isDefault: true,
    },
  });
};
