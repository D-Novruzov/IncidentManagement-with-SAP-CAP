/**
 * Reporting logic for incidents and resolution analytics.
 */
const cds = require("@sap/cds");
const LOG = cds.log("report-service");
const { createAuditLogger } = require("../../utils/audit-logger");
const { ReportRepository } = require("./report-repository");

class ReportLogic {
  constructor(entities) {
    this.repo = new ReportRepository(entities);
    this.auditLogger = createAuditLogger(entities);
  }
  async incidentStats() {
    const totalIncidents = await this.repo.totalIncidents();
    const openIncidents = await this.repo.openIncidents();
    const closedIncidents = await this.repo.closedIncidents();
    const isConsistent = totalIncidents == openIncidents + closedIncidents;

    await this.auditLogger("Incidents", null, "GET", null, null, null);

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
  }

  async avgResolutionTimeByType() {
    const result = await this.repo.avgResolutionTimeByType();

    await this.auditLogger(
      "IncidentResolveTime",
      null,
      "GET",
      null,
      null,
      null,
    );

    LOG.info("Average resolution time by type retrieved", {
      entity: "IncidentResolveTime",
      recordCount: result.length,
    });

    return result;
  }

  async incidentsByPriority() {
    const result = await this.repo.incidentsByPriority();

    await this.auditLogger("Incidents", null, "GET", null, null, null);

    LOG.info("Incidents by priority retrieved", {
      entity: "Incidents",
      recordCount: result.length,
    });

    return result;
  }
}

module.exports = ReportLogic;
