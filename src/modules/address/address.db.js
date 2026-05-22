import { prisma } from "../../config/prisma.js";

export const getAddressesByUser = (userId) => {
  return prisma.address.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
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
};

export const deleteAddress = (id) => {
  return prisma.address.delete({
    where: { id },
  });
};
