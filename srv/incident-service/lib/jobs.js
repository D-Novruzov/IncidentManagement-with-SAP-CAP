/**
 * Scheduled jobs and SLA maintenance for Incident service.
 * Contains cleanup and SLA status update routines.
 */
const cds = require("@sap/cds");
const LOG = cds.log("incident-service");

const priority = ["LOW", 
  "MEDIUM",
  "HIGH",
  "CRITICAL"
]

  /**
   * Public action wrapper for the scheduled job.
   * @param {import('@sap/cds/apis/services').Request} req
   * @returns {Promise<{message:string}>}
   */
  const _runScheduledJob =  async (req) =>  {
    return runScheduledJob(req);
  }

  /**
   * Executes the scheduled maintenance job within tenant context.
   * - Cleans up closed incidents
   * - Updates SLA properties for open incidents
   * @param {import('@sap/cds/apis/services').Request} req
   */
  async function runScheduledJob(req) {
    LOG.info("Scheduled job triggered");

    
      try {
        await cds.spawn({tenant: req.tenant }, async (tx) => {
          const deletedCount = await cleanupClosedIncidents(tx);
          await setSLAProperties(tx);
          LOG.info("Scheduled job finished", { deletedCount });
        });
      } catch (err) {
        LOG.error("Scheduled job failed", err);
      }
      return { message: "Job started" };
    };

    
  

  /**
   * Deletes incidents with status CLOSED.
   * @param {import('@sap/cds/apis/cds').tx} tx CAP transaction
   * @returns {Promise<number>} number of deleted records
   */
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

  /**
   * Computes and updates SLA related fields for open incidents.
   * @param {import('@sap/cds/apis/cds').tx} tx CAP transaction
   */
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
  /**
   * Determines SLA status based on time remaining vs total duration.
   * @param {{slaDueDate:number, slaDuration:number, priority:string}} incident
   * @returns {"ONTRACK"|"ATRISK"|"BREACHED"}
   */
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

// Export functions for use by the service and for unit testing
module.exports = {
  _runScheduledJob,
  runScheduledJob,
  cleanupClosedIncidents,
  setSLAProperties,
  UpdateSlaStatus,
};
