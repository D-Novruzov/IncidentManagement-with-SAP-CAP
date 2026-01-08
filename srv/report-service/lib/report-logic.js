const cds = require("@sap/cds");
const LOG = cds.log("report-service");
const { createAuditLogger } = require('../../utils/audit-logger');

const incidentStats = async (req, entities) => {
  const { Incidents } = entities;
  const auditLogger = createAuditLogger(entities);

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

const avgResolutionTimeByType = async (req, entities) => {
  const { IncidentResolveTime } = entities;
  const auditLogger = createAuditLogger(entities);

  const result = await SELECT.from(IncidentResolveTime)
    .columns([
      "IncidentType",
      { func: "count", args: [{ ref: ["ID"] }], as: "count" },
      { func: "avg", args: [{ ref: ["timeSpent"] }], as: "avgTime" },
    ])
    .groupBy("incidentType");

  await auditLogger("IncidentResolveTime", null, "GET", null, null, null);

  LOG.info("Average resolution time by type retrieved", {
    entity: "IncidentResolveTime",
    recordCount: result.length,
  });

  return result;
};

const incidentsByPriority = async (req, entities) => {
  const { Incidents } = entities;
  const auditLogger = createAuditLogger(entities);

  const result = await SELECT.from(Incidents)
    .where({ status: "OPEN" })
    .columns(['priority as Priority', { func: "count", args: [{ ref: ["ID"] }], as: "count" }])
    .groupBy("priority");

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
