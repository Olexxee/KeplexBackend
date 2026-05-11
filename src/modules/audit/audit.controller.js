import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as auditService from "./audit.service.js";

export const getAuditLogs = asyncWrapper(async (req, res) => {
  const logs = await auditService.getAuditLogs();

  return successResponse({
    res,
    message: "Audit logs fetched successfully",
    data: logs,
  });
});
