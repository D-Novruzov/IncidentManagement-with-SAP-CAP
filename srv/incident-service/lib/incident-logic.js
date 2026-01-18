/**
 * Incident business logic utilities.
 * Contains pure business logic - database operations delegated to repository.
 */
const cds = require("@sap/cds");
const LOG = cds.log("incident-service");

const {
  PRIORITY_BY_TYPE,
  SLA_DURATION_HOURS,
} = require("../../config/sla-config");
const { createAuditLogger } = require("../../utils/audit-logger");
const { IncidentRepository } = require("./incident-repository");

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/**
 * Factory to create repository instance from entities
 * @param {Record<string, any>} entities
 * @returns {IncidentRepository}
 */
const createRepository = (entities) => new IncidentRepository(entities);

/**
 * Adds optional filters to a READ query for Incidents based on URL parameters.
 * @param {import('@sap/cds/apis/services').Request} req CAP request
 */
const advancedSearch = (req) => {
  const { title, minPriority, status } = req.http.req.query || {};
  if (title) req.query.where({ title: { like: `%${title}%` } });
  if (minPriority) req.query.where({ priority: minPriority });
  if (status) req.query.where({ status: { like: `%${status}%` } });
  LOG.info("advanced query reached the end");
};

/**
 * Validate incident existence and status prior to closing.
 * @param {import('@sap/cds/apis/services').Request} req
 * @param {Record<string, any>} entities
 */
const checkIncident = async (req, entities) => {
  const repository = createRepository(entities);
  const incidentId = req.data?.incidentId || req.data?.incidentID;

  // Validation
  if (!incidentId) {
    throw cds.error({ code: 400, message: "incidentId is required" });
  }

  // Check incident exists
  const incident = await repository.findIncidentById(incidentId);
  if (!incident) {
    throw cds.error({ code: 404, message: "Incident not found" });
  }

  // Check status
  if (incident.status === "CLOSED") {
    throw cds.error({ code: 400, message: "Incident is already closed" });
  }
};

/**
 * Close an incident: updates status, writes resolvedAt, and logs audit.
 * @param {import('@sap/cds/apis/services').Request} req
 * @param {Record<string, any>} entities
 * @returns {{ID:string, status:string}}
 */
const _closeIncident = async (req, entities) => {
  const repository = createRepository(entities);
  const auditLogger = createAuditLogger(entities);
  const incidentId = req.data.incidentId;

  // Validate incidentId (also checked in checkIncident before hook when used via controller)
  if (!incidentId) {
    throw cds.error({ code: 400, message: "incidentId is required" });
  }

  // Get the incident report
  const incident = await repository.findReportById(incidentId);
  if (!incident) {
    throw cds.error({ code: 404, message: "Incident not found" });
  }

  const oldStatus = incident.status;
  const resolvedAt = new Date();

  try {
    // Close the incident
    await repository.closeIncident(incidentId, resolvedAt);
    await auditLogger(
      "Incident",
      incidentId,
      "CLOSE",
      "status",
      oldStatus,
      "CLOSED",
    );

    // Track resolution time
    const createdAt = incident.createdAt;
    if (createdAt) {
      const timeSpent = Math.max(
        0,
        Math.round((new Date() - new Date(createdAt)) / 60000),
      );
      await repository.createResolveTime({
        incidentID_ID: incidentId,
        incidentType: incident.type,
        timeSpent,
      });
      LOG.info("IncidentResolveTime recorded", { incidentId, timeSpent });
    }
  } catch (err) {
    LOG.error("Failed to close incident", err);
    throw cds.error({ code: 500, message: "PERSIST_FAILED" });
  }

  LOG.info("Incident closed successfully", { incidentId });
  return { ID: incidentId, status: "CLOSED" };
};

/**
 * Reopen a previously closed incident and reset SLA fields.
 * @param {import('@sap/cds/apis/services').Request} req
 * @param {Record<string, any>} entities
 * @returns {{ID:string, status:string}}
 */
const _reopenIncident = async (req, entities) => {
  const repository = createRepository(entities);
  const auditLogger = createAuditLogger(entities);
  const { incidentId } = req.data;

  // Find and validate incident
  const incident = await repository.findIncidentById(incidentId);
  if (!incident) {
    throw cds.error({
      code: 404,
      message: "There is no incident with this id",
    });
  }
  if (incident.status !== "CLOSED") {
    throw cds.error({
      code: 403,
      message: "To reopen the incident it should be closed",
    });
  }

  // Calculate new SLA fields
  const now = Date.now();
  const reopenData = {
    resolvedAt: null,
    slaBreachedAt: null,
    slaStartTime: now,
    slaDueDate: now + incident.slaDuration,
    status: "OPEN",
    slaStatus: "ONTRACK",
  };

  // Update incident
  await repository.reopenIncident(incidentId, reopenData);

  // Get updated entity for audit
  const updatedEntity = await repository.findIncidentById(incidentId);
  await auditLogger(
    entities.Incidents,
    incidentId,
    "REOPEN",
    "status",
    "CLOSE",
    updatedEntity.status,
  );

  LOG.info("Incident has been reopened", {
    incidentId,
    fieldsChanged: Object.keys(reopenData),
  });
  return {
    ID: incidentId,
    status: updatedEntity.status,
  };
};

/**
 * Validate assignment preconditions for an incident and user.
 * @param {import('@sap/cds/apis/services').Request} req
 * @param {Record<string, any>} entities
 */
const checkAssignIncident = async (req, entities) => {
  const repository = createRepository(entities);
  const incidentID = req.data?.incidentID;
  const userId = req.data?.userId;

  // Validate required fields
  if (!incidentID) {
    throw cds.error({ code: 400, message: "incidentID is required" });
  }
  if (!userId) {
    throw cds.error({ code: 400, message: "userId is required" });
  }

  // Check incident exists and is valid
  const incident = await repository.findIncidentById(incidentID);
  if (!incident) {
    throw cds.error({ code: 404, message: "Invalid incident id" });
  }
  if (incident.status === "CLOSED") {
    throw cds.error({ code: 400, message: "Incident is already closed" });
  }
  if (incident.assignedTo_userId) {
    throw cds.error({
      code: 403,
      message: "Incident is already assigned to user",
    });
  }

  // Check user exists
  const user = await repository.findUserById(userId);
  if (!user) {
    throw cds.error({ code: 404, message: "Invalid user id" });
  }
};

/**
 * Assign an incident to a specific user within a transaction.
 * @param {import('@sap/cds/apis/services').Request} req
 * @param {Record<string, any>} entities
 */
const _assignIncident = async (req, entities) => {
  const repository = createRepository(entities);
  const auditLogger = createAuditLogger(entities);
  const { incidentID, userId } = req.data || {};

  return cds.tx(req, async (tx) => {
    const incident = await repository.findIncidentForUpdate(tx, incidentID);

    if (!incident) {
      LOG.error("Incident not found during assignment", { incidentID });
      throw cds.error({ code: 404, message: "Incident not found" });
    }

    const oldAssignee = incident.assignedTo_userId;
    await repository.assignIncident(tx, incidentID, userId);

    await auditLogger(
      "Incident",
      incidentID,
      "UPDATE",
      "assignedTo_userId",
      oldAssignee || "",
      userId,
    );

    LOG.info("Incident Assigned successfully", {
      incidentID,
      assignedTo: userId,
      entity: "ReportIncidentEntity",
      caller: req.user?.id,
    });
  });
};

/**
 * Create a new report and its associated incident record.
 * @param {import('@sap/cds/apis/services').Request} req
 * @param {Record<string, any>} entities
 * @returns {{ID:string, message:string}}
 */
const _reportIncidentAction = async (req, entities) => {
  const repository = createRepository(entities);
  const auditLogger = createAuditLogger(entities);
  const { incidentID, title, description, type, customer } = req.data || {};

  // Validate required fields
  if (!incidentID) {
    throw cds.error({ code: 400, message: "incidentID is required" });
  }
  if (!title) {
    throw cds.error({ code: 400, message: "title is required" });
  }
  if (!description) {
    throw cds.error({ code: 400, message: "description is required" });
  }
  if (!type) {
    throw cds.error({ code: 400, message: "type is required" });
  }

  // Check if report already exists
  const existingReport = await repository.findReportById(incidentID);
  if (existingReport) {
    return { ID: incidentID, message: "Report Incident already exists" };
  }

  try {
    // Create report entry
    const reportEntry = {
      ID: incidentID,
      title,
      description,
      type,
      customer_ID: customer || null,
    };
    await repository.createReport(reportEntry);
    LOG.info("ReportIncident created successfully", { incidentID });

    // Create incident entry with SLA
    const priority = PRIORITY_BY_TYPE[type];
    const slaDuration = SLA_DURATION_HOURS[priority];
    const incidentEntry = {
      ID_ID: incidentID,
      title,
      status: "OPEN",
      priority,
      category_code: null,
      country_code: null,
      assignedTo_userId: null,
      resolvedAt: null,
      slaDuration,
      slaStartTime: Date.now(),
      slaDueDate: Date.now() + slaDuration * 60 * 60 * 1000,
      slaStatus: "ONTRACK",
      slaBreachedAt: null,
    };

    await repository.createIncident(incidentEntry);
    LOG.info("Incident created successfully", { incidentEntry });

    // Verify creation
    const verifyIncident = await repository.findIncidentById(incidentID);
    if (!verifyIncident) {
      LOG.error("Incident creation verification failed", { incidentID });
      throw new Error("Failed to verify incident creation");
    }
    LOG.info("Incident verified in database", {
      incidentID,
      incident: verifyIncident,
    });

    // Audit log
    await auditLogger("Incident", incidentID, "CREATE", null, null, null);

    return {
      ID: incidentID,
      message: "Incident Successfully reported",
    };
  } catch (err) {
    LOG.error("Failed to create incident entry", err);
    throw cds.error({ code: 500, message: "PERSIST_FAILED" });
  }
};

/** Public API of incident logic functions. */
module.exports = {
  advancedSearch,
  _reopenIncident,
  _assignIncident,
  _closeIncident,
  _reportIncidentAction,
  checkIncident,
  checkAssignIncident,
  // Export for testing with dependency injection
  createRepository,
};
