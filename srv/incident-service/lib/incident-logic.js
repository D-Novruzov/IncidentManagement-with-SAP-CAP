/**
 * Incident business logic utilities.
 * Contains pure business logic - database operations delegated to repository.
 */
const cds = require("@sap/cds");
const LOG = cds.log("incident-service");

const { PRIORITY_BY_TYPE, SLA_DURATION_HOURS } = require('../../config/sla-config');
const { createAuditLogger } = require('../../utils/audit-logger');
const { IncidentRepository } = require('./incident-repository');
const { SELECT } = require("@sap/cds/lib/ql/cds-ql");

class IncidentLogic {
  constructor(entities) {
    this.repo = new IncidentRepository(entities);
    this.auditLogger = createAuditLogger(entities);
    this.PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  }

  advancedSearch(req) {
    const { title, minPriority, status } = req.http.req.query || {};
    if (title) req.query.where({ title: { like: `%${title}%` } });
    if (minPriority) req.query.where({ priority: minPriority });
    if (status) req.query.where({ status: { like: `%${status}%` } });
    LOG.info("advanced query reached the end");
  }

  async checkIncident(req) {
    const incidentId = req.data?.incidentId || req.data?.incidentID;

    // Validation
    if (!incidentId) {
      throw cds.error({ code: 400, message: "incidentId is required" });
    }

    // Check incident exists
    const incident = await this.repo.findIncidentById(incidentId);
    if (!incident) {
      throw cds.error({ code: 404, message: "Incident not found" });
    }

    // Check status
    if (incident.status === "CLOSED") {
      throw cds.error({ code: 400, message: "Incident is already closed" });
    }
  }

  async _closeIncident(req) {
    const incidentId = req.data.incidentId;

    // Validate incidentId (also checked in checkIncident before hook when used via controller)
    if (!incidentId) {
      throw cds.error({ code: 400, message: "incidentId is required" });
    }

    // Get the incident report
    const incident = await this.repo.findReportById(incidentId);
    if (!incident) {
      throw cds.error({ code: 404, message: "Incident not found" });
    }

    const oldStatus = incident.status;
    const resolvedAt = new Date();

    try {
      // Close the incident
      await this.repo.closeIncident(incidentId, resolvedAt);
      await this.auditLogger(
        "Incident",
        incidentId,
        "CLOSE",
        "status",
        oldStatus,
        "CLOSED"
      );

      // Track resolution time
      const createdAt = incident.createdAt;
      if (createdAt) {
        const timeSpent = Math.max(
          0,
          Math.round((new Date() - new Date(createdAt)) / 60000)
        );
        await this.repo.createResolveTime({
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
  }

  async _reopenIncident(req) {
    const { incidentId } = req.data;

    // Find and validate incident
    const incident = await this.repo.findIncidentById(incidentId);
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
    await this.repo.reopenIncident(incidentId, reopenData);

    // Get updated entity for audit
    const updatedEntity = await this.repo.findIncidentById(incidentId);
    await this.auditLogger(
      "Incidents",
      incidentId,
      "REOPEN",
      "status",
      "CLOSE",
      updatedEntity.status
    );

    LOG.info("Incident has been reopened", {
      incidentId,
      fieldsChanged: Object.keys(reopenData),
    });
    return {
      ID: incidentId,
      status: updatedEntity.status,
    };
  }

  async checkAssignIncident(req) {
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
    const incident = await this.repo.findIncidentById(incidentID);
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
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw cds.error({ code: 404, message: "Invalid user id" });
    }
  }

  async _assignIncident(req) {
    const { incidentID, userId } = req.data || {};

    const incident = await this.repo.findIncidentById(incidentID);

    if (!incident) {
      LOG.error('Incident not found during assignment', { incidentID });
      throw cds.error({ code: 404, message: 'Incident not found' });
    }

    const oldAssignee = incident.assignedTo_userId;
    await this.repo.assignIncidentById(incidentID, userId);

    await this.auditLogger(
      "Incident",
      incidentID,
      "UPDATE",
      "assignedTo_userId",
      oldAssignee || "",
      userId
    );

    LOG.info("Incident Assigned successfully", {
      incidentID,
      assignedTo: userId,
      entity: "ReportIncidentEntity",
      caller: req.user?.id,
    });
  }

  async _reportIncidentAction(req) {
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
    const existingReport = await this.repo.findReportById(incidentID);
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
      await this.repo.createReport(reportEntry);
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

      await this.repo.createIncident(incidentEntry);
      LOG.info("Incident created successfully", { incidentEntry });

      // Verify creation
      const verifyIncident = await this.repo.findIncidentById(incidentID);
      if (!verifyIncident) {
        LOG.error("Incident creation verification failed", { incidentID });
        throw new Error("Failed to verify incident creation");
      }
      LOG.info("Incident verified in database", {
        incidentID,
        incident: verifyIncident,
      });

      // Audit log
      await this.auditLogger("Incident", incidentID, "CREATE", null, null, null);
      
      return {
        ID: incidentID,
        message: "Incident Successfully reported",
      };
    } catch (err) {
      LOG.error("Failed to create incident entry", err);
      throw cds.error({ code: 500, message: "PERSIST_FAILED" });
    }
  }
}

module.exports = IncidentLogic;
