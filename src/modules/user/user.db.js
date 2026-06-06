import { prisma } from "../../config/prisma.js";

export const updateUser = async (id, data) => {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });
};
