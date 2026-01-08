    
    
    
    const cds = require("@sap/cds");
    const LOG = cds.log("incident-service");
    
    const { PRIORITY_BY_TYPE, SLA_DURATION_HOURS } = require('../../config/sla-config');
    const priority = ["LOW", 
      "MEDIUM",
      "HIGH",
      "CRITICAL"
    ]
    const {createAuditLogger} = require('../../utils/audit-logger')

    

    const advancedSearch =(req) => {
      
      const {title, minPriority, status} = req.http.req.query || {}
      if(title) req.query.where({ title : { 'like': `%${title}%`}});
      if(priority) req.query.where({priority : minPriority}) 
      if(status) req.query.where({status : {'like': `%${ status}%`}}) 
      LOG.info('advanced query reached the end')
      }



    const checkIncident = async (req, entities) => {
    const { Incidents } = entities;
    
    const incidentId = req.data?.incidentId || req.data?.incidentID;
    const auditLogger = createAuditLogger(entities);
    
    if (!incidentId)
      throw cds.error({ code: 400, message: "incidentId is required" });

    const incident = await SELECT.one
      .from(Incidents)
      .where({ ID_ID: incidentId });
    if (!incident)
      throw cds.error({ code: 404, message: "Incident not found" });

    if (incident.status === "CLOSED")
      throw cds.error({ code: 400, message: "Incident is already closed" });
  }
    const _closeIncident  = async (req, entities) =>  {
      const { Incidents, ReportIncidentEntity, IncidentResolveTime } = entities;
      const auditLogger = createAuditLogger(entities);
      const incidentId = req.data.incidentId;

      if (!incidentId) {
        throw cds.error({ code: 400, message: "incidentId is required" });
      }

      
      const incident = await SELECT.one
        .from(ReportIncidentEntity)
        .where({ ID: incidentId });
      if (!incident) {
        throw cds.error({ code: 404, message: "Incident not found" });
      }

      const oldStatus = incident.status;
      const resolvedAt = new Date();

    try {
      await UPDATE(Incidents).set({ status: 'CLOSED', resolvedAt }).where({ ID_ID: incidentId });
      await auditLogger('Incident', incidentId, 'CLOSE', 'status', oldStatus, 'CLOSED');

      const createdAt = incident.createdAt
          let timeSpent;
          if (createdAt) {
            timeSpent = Math.max(0, Math.round((new Date() - new Date(createdAt)) / 60000));
            
              await INSERT.into(IncidentResolveTime).entries({
                incidentID_ID: incidentId, 
                incidentType: incident.type,
                timeSpent
              });
              
              LOG.info('IncidentResolveTime entity not present — skipping time tracking', { incidentId, timeSpent });
      }
    } catch (err) {
      LOG.error('Failed to close incident', err);
      throw cds.error({ code: 500, message: 'PERSIST_FAILED' });
    }

      LOG.info("Incident closed successfully", { incidentId });
      return { ID: incidentId, status: "CLOSED" };
    }
     const _reopenIncident = async (req, entities) => {
      const {Incidents} = entities;
      const { incidentId} = req.data
      const auditLogger = createAuditLogger(entities);

      const incident = await SELECT.one.from(Incidents).where({ID_ID : incidentId})
      if(!incident) throw cds.error({code:404, message: 'There is no incident with this id'});
      if(incident.status !== 'CLOSED') throw cds.error({code: 403, message: 'To reopen the incident it should be closed'})
      const now = Date.now()
      await UPDATE(Incidents).set({resolvedAt: null, slaBreachedAt: null, slaStartTime: now, slaDueDate: now + incident.slaDuration, status: 'OPEN', slaStatus: 'ONTRACK' }).where({ID_ID: incidentId})

      const updatedEntity = await SELECT.one.from(Incidents).where({ID_ID: incidentId})
      await auditLogger(Incidents, incidentId, 'REOPEN', 'status', 'CLOSE', updatedEntity.status)
      LOG.info('Incident has been reopened, following fields where changed: status slaStatus resolvedAt slaBreachedAt slaStartTime slaDueDate')
      return {
            ID     : incidentId,
            status : updatedEntity.status
      }
      
    }
    const checkAssignIncident = async (req, entities) => {
    const { Incidents, UserReference } = entities;
    const incidentID = req.data?.incidentID;
    
    const userId = req.data?.userId;
    if (!incidentID)
      throw cds.error({ code: 400, message: "incidentID is required" });
    if (!userId) throw cds.error({ code: 400, message: "userId is required" });

    const incident = await SELECT.one
      .from(Incidents)
      .where({ ID_ID: incidentID });
    const user = await SELECT.one.from(UserReference).where({ userId: userId });

    if (!incident)
      throw cds.error({ code: 404, message: "Invalid incident id" });
    if (incident.status === "CLOSED")
      throw cds.error({ code: 400, message: "Incident is already closed" });
    if (!user) throw cds.error({ code: 404, message: "Invalid user id" });
    if (incident.assignedTo_userId)
      throw cds.error({
        code: 403,
        message: "Incident is already assigned to user",
      });
  }
    const _assignIncident = async (req, entities) => {
      const { Incidents } = entities;
      
      const { incidentID, userId } = req.data || {};
      const auditLogger = createAuditLogger(entities);
  
      cds.tx(req, async (tx) => {
        const incident = tx.run(await SELECT.one.from(Incidents).where({ ID_ID: incidentID }).forUpdate());
      
       if (!incident) {
        LOG.error('Incident not found during assignment', { incidentID });
        throw cds.error({ code: 404, message: 'Incident not found' });
      }
  
      const oldAssignee = incident.assignedTo_userId;
      await tx.run(UPDATE(Incidents)
        .set({ assignedTo_userId: userId })
        .where({ ID_ID: incidentID }));
  
      await auditLogger(
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
    })
    }

  const _reportIncidentAction = async (req, entities) => {
    const { Incidents, ReportIncidentEntity } = entities;
    const { incidentID, title, description, type, customer } = req.data || {};
    const auditLogger = createAuditLogger(entities);

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

    const existingReport = await SELECT.one
      .from(ReportIncidentEntity)
      .where({ ID: incidentID });
    if (existingReport) {
      return { ID: incidentID, message: "Report Incident already exists" };
    }

    try {
      const reportIncidentEntry = {
        ID: incidentID,
        title: title,
        description: description,
        type: type,
        customer_ID: customer || null,
      };

      await INSERT.into(ReportIncidentEntity).entries(reportIncidentEntry);
      
      LOG.info('ReportIncident created successfully', { incidentID });


      const incidentEntry = {
        ID_ID: incidentID,
        title: title,
        status: "OPEN",
        priority: PRIORITY_BY_TYPE[type],
        category: null,        
        country: null,         
        assignedTo: null, 
        resolvedAt: null,
        slaDuration  : SLA_DURATION_HOURS[PRIORITY_BY_TYPE[type]],
        slaStartTime : Date.now(),
        slaDueDate   : Date.now() + (SLA_DURATION_HOURS[PRIORITY_BY_TYPE[type]] * 60 * 60 * 1000),
        slaStatus   : "ONTRACK",
        slaBreachedAt: null,
        resolvedAt   : null
      };
      console.log(incidentEntry.priority)
      console.log(SLA_DURATION_HOURS[PRIORITY_BY_TYPE[type]])
      await INSERT.into(Incidents).entries(incidentEntry);
      

      LOG.info('Incident created successfully', { incidentEntry });


      const verifyIncident = await SELECT.one.from(Incidents).where({ ID_ID: incidentID });
      if (!verifyIncident) {
        LOG.error('Incident creation verification failed', { incidentID });
        throw new Error('Failed to verify incident creation');
      }
      LOG.info('Incident verified in database', { incidentID, incident: verifyIncident });
      
  
      await auditLogger(
        "Incident",
        incidentID,
        "CREATE",
        null,
        null,
        null
      );

      return { 
        ID: incidentID,
        message: 'Incident Successfully reported'
      };
    } catch (err) {
      LOG.error("Failed to create incident entry", err);
      throw cds.error({ code: 500, message: "PERSIST_FAILED" });
    }
  }


  module.exports = {
    advancedSearch, _reopenIncident, _assignIncident, _closeIncident, _reportIncidentAction, checkIncident, checkAssignIncident
  }