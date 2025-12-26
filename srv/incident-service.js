const cds = require("@sap/cds");

const LOG = cds.log("incident-service");

/**
 * IncidentService - Handles all incident management operations
 * Provides functionality for creating, updating, assigning, and closing incidents
 * with comprehensive audit logging capabilities
 */
class IncidentService extends cds.ApplicationService {
  /**
   * Initializes the Incident Service and registers all event handlers
   * Sets up before/after hooks for validation and business logic
   * @returns {Promise<void>}
   */
  async init() {
    this.before("closeIncident", this.checkIncident);


    this.on("closeIncident", async (req) => {
      const { Incidents, ReportIncidentEntity, IncidentResolveTime } = this.entities;
      const incidentId = req.data.incidentId;

    if (!incidentId) {
      throw cds.error({ code: 400, message: 'incidentId is required' });
    }

    // load incident and optional report record
    const incident = await SELECT.one.from(ReportIncidentEntity).where({ ID: incidentId });
    if (!incident) {
      throw cds.error({ code: 404, message: 'Incident not found' });
    }


    const oldStatus = incident.status;
    const resolvedAt = new Date();

    try {
      await UPDATE(Incidents).set({ status: 'CLOSED', resolvedAt }).where({ ID_ID: incidentId });
      console.log(
        'status closed'
      )
      await this.auditLogger('Incident', incidentId, 'CLOSE', 'status', oldStatus, 'CLOSED');
      console.log('audit logged')

      const createdAt = incident.createdAt
          let timeSpent;
          if (createdAt) {
            timeSpent = Math.max(0, Math.round((new Date() - new Date(createdAt)) / 60000));
            console.log('time calculated', timeSpent)
            
            console.log(IncidentResolveTime)
            
              await INSERT.into(IncidentResolveTime).entries({
                ID_ID: incidentId, 
                incidentType: incident.type,
                timeSpent
              });
              
            
              LOG.info('IncidentResolveTime entity not present — skipping time tracking', { incidentId, timeSpent });
          
            console.log('time track happen');
      }
    } catch (err) {
      LOG.error('Failed to close incident', err);
      throw cds.error({ code: 500, message: 'PERSIST_FAILED' });
    }

    LOG.info('Incident closed successfully', { incidentId });
    return { ID: incidentId, status: 'CLOSED' }
    });

    
    this.before("assignIncident", this.checkAssignIncident);
    this.on("assignIncident", async (req) => {
      
    const { Incidents } = this.entities;
    console.log(req)
    LOG.info('assignIncident called with data:', req.data);
    const { incidentID, userId } = req.data || {};
    LOG.info('Extracted params:', { incidentID, userId });

    const incident = await SELECT.one.from(Incidents).where({ ID_ID: incidentID });
    
    if (!incident) {
      LOG.error('Incident not found during assignment', { incidentID });
      throw cds.error({ code: 404, message: 'Incident not found' });
    }

    const oldAssignee = incident.assignedTo_userId;
    await UPDATE(Incidents)
      .set({ assignedTo_userId: userId })
      .where({ ID_ID: incidentID });

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
    });



    // Report Incident Action: create both ReportIncident and Incident entries
    this.on("ReportIncidentAction", async (req) =>  {
      const { Incidents, ReportIncidentEntity } = this.entities;
      const { incidentID, title, description, type, customer } = req.data || {};

      if (!incidentID) {
        throw cds.error({ code: 400, message: 'incidentID is required' });
      }

      if (!title) {
        throw cds.error({ code: 400, message: 'title is required' });
      }

      if (!description) {
        throw cds.error({ code: 400, message: 'description is required' });
      }

      if (!type) {
        throw cds.error({ code: 400, message: 'type is required' });
      }

      // Check if ReportIncident already exists
      const existingReport = await SELECT.one.from(ReportIncidentEntity).where({ ID: incidentID });
      if (existingReport) {
        return { ID: incidentID, message: 'Report Incident already exists' };
      }

      try {
        // Step 1: Create ReportIncident
        const reportIncidentEntry = {
          ID: incidentID,
          title: title,
          description: description,
          type: type,
          customer: customer ? { ID: customer } : null
        };

        await INSERT.into(ReportIncidentEntity).entries(reportIncidentEntry);
        LOG.info('ReportIncident created successfully', { incidentID });


        const incidentEntry = {
          ID_ID: incidentID,  
          title: title,
          status: 'OPEN',
          priority: 'MEDIUM',
          category: null,
          country: null,
          assignedTo: null,
          resolvedAt: null
        };

        await INSERT.into(Incidents).entries(incidentEntry);
        LOG.info('Incident created successfully', { incidentID });

        // Verify the Incident was created
        const verifyIncident = await SELECT.one.from(Incidents).where({ ID_ID: incidentID });
        if (!verifyIncident) {
          LOG.error('Incident creation verification failed', { incidentID });
          throw new Error('Failed to verify incident creation');
        }
        LOG.info('Incident verified in database', { incidentID, incident: verifyIncident });

        // Step 3: Audit log
        await this.auditLogger(
          'Incident',
          incidentID,
          'CREATE',
          null,
          null,
          null
        );

        return { 
          ID: incidentID,
          message: 'Incident Successfully reported'
        };
      } catch (err) {
        LOG.error('Failed to create incident entry', err);
        throw cds.error({ code: 500, message: 'PERSIST_FAILED' });
      }
    });

    this.on("incidentStats", this.incidentStats);

    this.on("runScheduledJob", async (req) => {
      return this.runScheduledJob(req);
    });
    return super.init();
  }

  async runScheduledJob(req) {
    LOG.info("Scheduled job triggered");

    cds.spawn(async () => {
      try {
        const deletedCount = await this.cleanupClosedIncidents();
        LOG.info("Scheduled job finished", { deletedCount });
      } catch (err) {
        LOG.error("Scheduled job failed", err);
      }
    });

    return { message: "Job started" };
  }
  /**
   * Creates an audit log entry for tracking changes to entities
   * Logs all modifications with old and new values for compliance and auditing purposes
   * @param {string} entityType - Type of entity being modified (e.g., 'Incident')
   * @param {string} entityKey - UUID of the entity being modified
   * @param {string} action - Action performed (CREATE, UPDATE, CLOSE)
   * @param {string} fieldChanged - Name of the field that was modified
   * @param {string} oldValue - Previous value before the change
   * @param {string} newValue - New value after the change
   * @returns {Promise<void>}
   */
  async auditLogger(
    entityType,
    entityKey,
    action,
    fieldChanged,
    oldValue,
    newValue
  ) {
    const { AuditLog } = this.entities;
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
  }

  /**
   * Validates incident existence and status before closing operations
   * Runs as a before hook to ensure incident can be modified
   * @param {object} req - Request object containing incident data
   * @throws {Error} 400 - If incident ID is missing or incident is already closed
   * @throws {Error} 404 - If incident is not found
   * @returns {Promise<void>}
   */
  async checkIncident(req) {

    const { Incidents } = this.entities;
    const incidentId = req.data?.incidentId || req.data?.incidentID;

    if (!incidentId) throw cds.error({ code: 400, message: 'incidentId is required' });

    const incident = await SELECT.one.from(Incidents).where({ ID_ID: incidentId });
    if (!incident) throw cds.error({ code: 404, message: 'Incident not found' });

    if (incident.status === 'CLOSED') throw cds.error({ code: 400, message: 'Incident is already closed' });
  }

  /**
   * Validates incident and user before assignment operations
   * Ensures incident exists, is not closed, user is valid, and incident is not already assigned
   * Runs as a before hook for assignIncident action
   * @param {object} req - Request object containing incidentID and userId
   * @throws {Error} 400 - If incidentID or userId is missing, or incident is closed
   * @throws {Error} 404 - If incident or user is not found
   * @throws {Error} 403 - If incident is already assigned to another user
   * @returns {Promise<void>}
   */
  async checkAssignIncident(req) {
    const { Incidents, UserReference } = this.entities;
     const incidentID = req.data?.incidentID;
     const userId = req.data?.userId;
     if (!incidentID) throw cds.error({ code: 400, message: 'incidentID is required' });
     if (!userId) throw cds.error({ code: 400, message: 'userId is required' });

     const incident = await SELECT.one.from(Incidents).where({ ID_ID: incidentID });
     const user = await SELECT.one.from(UserReference).where({ userId: userId });

     if (!incident) throw cds.error({ code: 404, message: 'Invalid incident id' });
     if (incident.status === 'CLOSED') throw cds.error({ code: 400, message: 'Incident is already closed' });
     if (!user) throw cds.error({ code: 404, message: 'Invalid user id' });
     if (incident.assignedTo_userId) throw cds.error({ code: 403, message: 'Incident is already assigned to user' });
  }

  /**
   * Closes an incident by updating its status to CLOSED
   * Creates an audit log entry to track the status change
   * @param {object} req - Request object containing incidentId
   * @returns {Promise<object>} Object containing closed incident ID and new status
   * @example
   * // Returns: { ID: "abc-123", status: "CLOSED" }
   */
  // async closeIncident(req) {;
  // }

  /**
   * Assigns an incident to a specific user
   * Updates the assignedTo_userId field and creates an audit log entry
   * @param {object} req - Request object containing incidentID and userId
   * @param {string} req.data.incidentID - UUID of the incident to assign
   * @param {string} req.data.userId - ID of the user to assign the incident to
   * @returns {Promise<void>}
   */



  /**
   * Retrieves statistical information about incidents
   * Provides counts for total, open, and closed incidents
   * @returns {Promise<object>} Statistics object with incident counts
   * @returns {number} return.totalIncidents - Total number of incidents
   * @returns {number} return.openIncidents - Number of incidents with OPEN status
   * @returns {number} return.closedIncidents - Number of incidents with CLOSED status
   */
  async incidentStats() {
    const { Incidents } = this.entities;

    const [{ count: totalIncidents }] = await SELECT.from(Incidents).columns([
      { func: "count", args: [{ ref: ["ID"] }], as: "count" },
    ]);

    const [{ count: openIncidents }] = await SELECT.from(Incidents)
      .where({ status: "OPEN" })
      .columns([{ func: "count", args: [{ ref: ["ID"] }], as: "count" }]);

    const [{ count: closedIncidents }] = await SELECT.from(Incidents)
      .where({ status: "CLOSED" })
      .columns([{ func: "count", args: [{ ref: ["ID"] }], as: "count" }]);
    const isConsistent = totalIncidents == openIncidents + closedIncidents;
    LOG.info("Incidents stats retrieved", {
      entity: "Incidents",
    });
    return {
      totalIncidents,
      openIncidents,
      closedIncidents,
      isConsistent,
    };
  }

  /**
   * Removes all closed incidents from the database
   * Performs bulk deletion of incidents with CLOSED status
   * Used for cleanup and maintenance operations
   * @param {object} req - Request object
   * @returns {Promise<object>} Result object with deletion status
   * @returns {string} return.message - Success message
   * @returns {number} return.deletedCount - Number of incidents deleted
   */
  async cleanupClosedIncidents() {
    const { Incidents } = this.entities;

    const deletedCount = await DELETE.from(Incidents).where({
      status: "CLOSED",
    });

    return deletedCount;
  }
}

module.exports = IncidentService;
