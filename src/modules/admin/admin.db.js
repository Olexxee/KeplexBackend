import { prisma } from "../../config/prisma.js";

const safeUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export const createUser = async (data) => {
  return prisma.user.create({
    data,
    select: safeUserSelect,
  });
};

export const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

export const findUserById = async (id) => {
  return prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });
};

export const findUsers = async ({ role, status, search } = {}) => {
  return prisma.user.findMany({
    where: {
      ...(role && { role }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    select: safeUserSelect,
    orderBy: { createdAt: "desc" },
  });
};

export const updateUserRole = async (id, role) => {
  return prisma.user.update({
    where: { id },
    data: { role },
    select: safeUserSelect,
  });
};

export const updateUserStatus = async (id, status) => {
  return prisma.user.update({
    where: { id },
    data: { status },
    select: safeUserSelect,
  });
};
