1/**
 * Reporting logic for incidents and resolution analytics.
 */
const cds = require("@sap/cds");
const LOG = cds.log("report-service");
const { createAuditLogger } = require('../../utils/audit-logger');
const ReportRepository = require('./report-repository')

/**
 * Returns total/open/closed incident counts and consistency check flag.
 * @param {import('@sap/cds/apis/services').Request} req
 * @param {Record<string, any>} entities
 * @returns {{totalIncidents:number, openIncidents:number, closedIncidents:number, isConsistent:boolean}}
 */
const incidentStats = async (req, entities) => {
  const reportRepository = new ReportRepository(entities)
  const auditLogger = createAuditLogger(entities);

  const totalIncidents = reportRepository.totalIncidents()
  const openIncidents = reportRepository.openIncidents()
  const closedIncidents = reportRepository.closedIncidents()
  const isConsistent = totalIncidents == openIncidents + closedIncidents;

  await auditLogger("Incidents", null, "GET", null, null, null);

  LOG.info("Incidents stats retrieved", {
    entity: "Incidents",
    totalIncidents,
    openIncidents,
    closedIncidents,
  });

  return {
    totalIncidents,
    openIncidents,
    closedIncidents,
    isConsistent,
  };
};

/**
 * Returns average resolution time and count grouped by incident type.
 * @param {import('@sap/cds/apis/services').Request} req
 * @param {Record<string, any>} entities
 */
const avgResolutionTimeByType = async (req, entities) => {
  const reportRepository = new ReportRepository(entities)
  const auditLogger = createAuditLogger(entities);

  const result = reportRepository.avgResolutionTimeByType()

  await auditLogger("IncidentResolveTime", null, "GET", null, null, null);

  LOG.info("Average resolution time by type retrieved", {
    entity: "IncidentResolveTime",
    recordCount: result.length,
  });

  return result;
};

/**
 * Returns open incident counts grouped by priority.
 * @param {import('@sap/cds/apis/services').Request} req
 * @param {Record<string, any>} entities
 */
const incidentsByPriority = async (req, entities) => {
  const reportRepository = new ReportRepository(entities)
  const auditLogger = createAuditLogger(entities);

  const result = reportRepository.incidentsByPriority()

  await auditLogger("Incidents", null, "GET", null, null, null);

  LOG.info("Incidents by priority retrieved", {
    entity: "Incidents",
    recordCount: result.length,
  });

  return result;
};

module.exports = {
  incidentStats,
  avgResolutionTimeByType,
  incidentsByPriority,
};
