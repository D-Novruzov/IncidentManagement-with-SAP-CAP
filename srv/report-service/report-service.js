/**
 * ReportService: exposes reporting actions for incidents analytics.
 */
const cds = require("@sap/cds");
const LOG = cds.log("report-service");

const { incidentStats, avgResolutionTimeByType, incidentsByPriority } = require('./lib/report-logic');

/** Service implementation for reporting analytics. */
class ReportService extends cds.ApplicationService {
  async init() {
    const entities = this.entities;

    this.on("incidentStats", async (req) => await incidentStats(req, entities));
    this.on("avgResolutionTimeByType", async (req) => await avgResolutionTimeByType(req, entities));
    this.on("incidentsByPriority", async (req) => await incidentsByPriority(req, entities));

    return super.init();
  }
}

module.exports = ReportService;
