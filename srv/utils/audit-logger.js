const cds = require("@sap/cds");
const LOG = cds.log("audit-service");

const createAuditLogger = (entities) => {
  return async (
    entityType,
    entityKey,
    action,
    fieldChanged,
    oldValue,
    newValue
  ) => {
    const { AuditLog } = entities;
    
    if (!AuditLog) {
      LOG.warn("AuditLog entity not available");
      return;
    }

    await INSERT.into(AuditLog).entries({
      entityType: entityType || null,
      entityKey: entityKey || null,
      action: action || null,
      fieldChanged: fieldChanged || null,
      oldValue: oldValue || null,
      newValue: newValue || null,
    });

    LOG.info(`Audit log created: ${action} on ${entityType}`, {
      entityKey,
      fieldChanged,
    });
  };
};

module.exports = { createAuditLogger };
