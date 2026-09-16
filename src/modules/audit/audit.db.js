import { prisma } from "../../config/prisma.js";

export const createAuditLog = async (
  {
    userId = null,
    action,
    entity,
    entityId = null,
    metadata = null,
  },
  tx = prisma,
) => {
  return tx.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      metadata,
    },
  });
};

export const getAuditLogs = async (tx = prisma) => {
  return tx.auditLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
  });
};