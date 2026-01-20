/**
 * IncidentRepository: Data access layer for incident operations.
 * All database operations are centralized here for easier testing and maintenance.
 */
const cds = require("@sap/cds");

class IncidentRepository {
  constructor(entities) {
    this.Incidents = entities.Incidents;
    this.ReportIncidentEntity = entities.ReportIncidentEntity;
    this.IncidentResolveTime = entities.IncidentResolveTime;
    this.UserReference = entities.UserReference;
    this.AuditLog = entities.AuditLog;
  }

  // ========================================
  // READ Operations
  // ========================================

  /**
   * Find incident by ID_ID field
   * @param {string} incidentId 
   * @returns {Promise<object|null>}
   */
  async findIncidentById(incidentId) {
    return cds.run(
      SELECT.one.from(this.Incidents).where({ ID_ID: incidentId })
    );
  }

  /**
   * Find report by ID
   * @param {string} reportId 
   * @returns {Promise<object|null>}
   */
  async findReportById(reportId) {
    return cds.run(
      SELECT.one.from(this.ReportIncidentEntity).where({ ID: reportId })
    );
  }

  /**
   * Find user by userId
   * @param {string} userId 
   * @returns {Promise<object|null>}
   */
  async findUserById(userId) {
    return cds.run(
      SELECT.one.from(this.UserReference).where({ userId: userId })
    );
  }

  /**
   * Find incident with lock for update
   * @param {object} tx - Transaction context
   * @param {string} incidentId 
   * @returns {Promise<object|null>}
   */
  async findIncidentForUpdate(tx, incidentId) {
    return tx.run(
      SELECT.one.from(this.Incidents).where({ ID_ID: incidentId }).forUpdate()
    );
  }

  // ========================================
  // CREATE Operations
  // ========================================

  /**
   * Create a new report incident entry
   * @param {object} data - Report data
   * @returns {Promise<object>}
   */
  async createReport(data) {
    return cds.run(
      INSERT.into(this.ReportIncidentEntity).entries(data)
    );
  }

  /**
   * Create a new incident entry
   * @param {object} data - Incident data
   * @returns {Promise<object>}
   */
  async createIncident(data) {
    return cds.run(
      INSERT.into(this.Incidents).entries(data)
    );
  }

  /**
   * Create incident resolve time record
   * @param {object} data - Resolve time data
   * @returns {Promise<object>}
   */
  async createResolveTime(data) {
    return cds.run(
      INSERT.into(this.IncidentResolveTime).entries(data)
    );
  }

  // ========================================
  // UPDATE Operations
  // ========================================

  /**
   * Close an incident - set status to CLOSED and resolvedAt timestamp
   * @param {string} incidentId 
   * @param {Date} resolvedAt 
   * @returns {Promise<object>}
   */
  async closeIncident(incidentId, resolvedAt) {
    return cds.run(
      UPDATE(this.Incidents)
        .set({ status: 'CLOSED', resolvedAt })
        .where({ ID_ID: incidentId })
    );
  }

  /**
   * Reopen an incident - reset SLA fields and status
   * @param {string} incidentId 
   * @param {object} data - Fields to update
   * @returns {Promise<object>}
   */
  async reopenIncident(incidentId, data) {
    return cds.run(
      UPDATE(this.Incidents)
        .set(data)
        .where({ ID_ID: incidentId })
    );
  }

  /**
   * Assign incident to user (with transaction)
   * @param {object} tx - Transaction context
   * @param {string} incidentId 
   * @param {string} userId 
   * @returns {Promise<object>}
   */
  async assignIncident(tx, incidentId, userId) {
    return tx.run(
      UPDATE(this.Incidents)
        .set({ assignedTo_userId: userId })
        .where({ ID_ID: incidentId })
    );
  }

  /**
   * Assign incident to user by ID (without explicit transaction)
   * @param {string} incidentId 
   * @param {string} userId 
   * @returns {Promise<object>}
   */
  async assignIncidentById(incidentId, userId) {
    return cds.run(
      UPDATE(this.Incidents)
        .set({ assignedTo_userId: userId })
        .where({ ID_ID: incidentId })
    );
  }
}

module.exports = { IncidentRepository };

