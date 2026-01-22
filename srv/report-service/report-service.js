/**
 * ReportService: exposes reporting actions for incidents analytics.
 */
const cds = require("@sap/cds");
const LOG = cds.log("report-service");

const ReportLogic = require('./lib/report-logic');

/** Service implementation for reporting analytics. */
class ReportService extends cds.ApplicationService {
  async init() {
    const reportLogic = new ReportLogic(this.entities);

    this.on("incidentStats", () => reportLogic.incidentStats());
    this.on("avgResolutionTimeByType", () => reportLogic.avgResolutionTimeByType());
    this.on("incidentsByPriority", () => reportLogic.incidentsByPriority());

    return super.init();
  }
}

module.exports = ReportService;
