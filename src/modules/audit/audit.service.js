import * as auditDb from "./audit.db.js";

export const logAudit = async ({
  userId = null,
  action,
  entity,
  entityId = null,
  metadata = null,
  tx = undefined,
}) => {
  return auditDb.createAuditLog(
    {
      userId,
      action,
      entity,
      entityId,
      metadata,
    },
    tx,
  );
};

export const getAuditLogs = async () => {
  return auditDb.getAuditLogs();
};
