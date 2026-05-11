import { prisma } from "../../config/prisma.js";

export const logAudit = async ({
  userId = null,
  action,
  entity,
  entityId = null,
  metadata = null,
}) => {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      metadata,
    },
  });
};

export const getAuditLogs = async () => {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
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
