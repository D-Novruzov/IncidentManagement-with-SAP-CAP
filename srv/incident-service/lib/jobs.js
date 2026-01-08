
const cds = require("@sap/cds");
const LOG = cds.log("incident-service");

const priority = ["LOW", 
  "MEDIUM",
  "HIGH",
  "CRITICAL"
]

  const _runScheduledJob =  async (req) =>  {
    return runScheduledJob(req);
  }

  async function runScheduledJob(req) {
    LOG.info("Scheduled job triggered");

    
      try {
        await cds.tx({tenant: req.tenant }, async (tx) => {
          const deletedCount = await cleanupClosedIncidents(tx);
          await setSLAProperties(tx);
          LOG.info("Scheduled job finished", { deletedCount });
        });
      } catch (err) {
        LOG.error("Scheduled job failed", err);
      }
      return { message: "Job started" };
    };

    
  

  async function cleanupClosedIncidents(tx) {
    const { Incidents } = tx.entities;

    const deletedCount = await tx.run(
      DELETE.from(Incidents).where({
        status: "CLOSED",
      })
    );

    LOG.info("Closed incidents cleanup completed", { deletedCount });
    return deletedCount;
  }

  async function setSLAProperties(tx) {
    const { Incidents } = tx.entities;
    const now = Date.now();
    
    const openIncidents = await tx.run(
      SELECT.from(Incidents).where({
        status: { '!=': 'CLOSED' }
      }).forUpdate()
    );
  
    for (const incident of openIncidents) {
      const newStatus = UpdateSlaStatus(incident);
      
      if (newStatus !== incident.slaStatus) {
        await tx.run(
          UPDATE(Incidents).set({
            slaStatus: newStatus
          }).where({ ID_ID: incident.ID_ID })
        );
        LOG.info('Incident SLA Status Updated Successfully', { incidentID: incident.ID_ID, newStatus });
      }
      
      if (newStatus === "BREACHED" && !incident.slaBreachedAt) {
        await tx.run(
          UPDATE(Incidents)
            .set({ slaBreachedAt: now, priority: "CRITICAL" })
            .where({ ID_ID: incident.ID_ID })
        );
        LOG.info('Incident SLA breached', { incidentID: incident.ID_ID });
      }
      
      const nextStatusIndex = priority.indexOf(incident.priority);
      if (newStatus === 'ATRISK' && nextStatusIndex != priority.length - 1 && nextStatusIndex >= 0) {
        const newPriority = priority[nextStatusIndex + 1];
        await tx.run( 
          UPDATE(Incidents).set({ priority: newPriority }).where({ ID_ID: incident.ID_ID })
        );
        LOG.info('Priority escalated due to SLA risk', { 
          incidentID: incident.ID_ID, 
          newPriority 
        });
      }
    }
    
    LOG.info('SLA properties updated', { processedCount: openIncidents.length });
  }
  async function UpdateSlaStatus(incident) {
  const currentTime = Date.now();
  const timeRemaining = incident.slaDueDate - currentTime;
  const totalDuration = incident.slaDuration * 60 * 60 * 1000; 
  
  if (timeRemaining <= 0) {
    return "BREACHED";
  } else if (timeRemaining < totalDuration * 0.25) {
    return "ATRISK";
  } else {
    return "ONTRACK";
  }
}
