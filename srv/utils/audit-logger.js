/**
 * Audit logging helper: returns a function to write audit entries.
 */
const cds = require("@sap/cds");
const LOG = cds.log("audit-service");

/**
 * Factory to create an audit logger bound to given CAP entities.
 * @param {Record<string, any>} entities CAP entities map
 * @returns {(entityType?:string, entityKey?:string|null, action?:string|null, fieldChanged?:string|null, oldValue?:any, newValue?:any) => Promise<void>}
 */
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
