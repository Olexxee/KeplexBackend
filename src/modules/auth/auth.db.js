import { prisma } from "../../config/prisma.js";

export const createUser = async (data) => {
  return prisma.user.create({
    data,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });
};

export const createRefreshToken = async (data) => {
  return prisma.refreshToken.create({ data });
};

export const findRefreshToken = async (tokenHash) => {
  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
};

export const updateUser = (id, data) => {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
    },
  });
};

export const deleteRefreshToken = async (tokenHash) => {
  return prisma.refreshToken.delete({
    where: { tokenHash },
  });
};

export const deleteAllUserRefreshTokens = async (userId) => {
  return prisma.refreshToken.deleteMany({
    where: { userId },
  });
};

export const findUserByEmailWithPassword = async (email) => {
  return prisma.user.findUnique({ where: { email } });
};

export const findUserById = async (id) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const revokeRefreshToken = async (id) => {
  return prisma.refreshToken.update({
    where: { id },
    data: {
      revokedAt: new Date(),
    },
  });
};

export const revokeAllUserRefreshTokens = async (userId) => {
  return prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};
