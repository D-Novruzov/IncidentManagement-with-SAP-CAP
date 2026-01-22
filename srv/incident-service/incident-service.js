/**
 * IncidentService: CAP service handlers wiring for incident operations.
 * Registers before/on handlers and delegates to logic layer.
 */
const cds = require("@sap/cds");

const IncidentLogic = require("./lib/incident-logic");
const { _runScheduledJob } = require("./lib/jobs");

/** Service implementation for Incident operations. */
class IncidentService extends cds.ApplicationService {
  async init() {
    const incidentLogic = new IncidentLogic(this.entities);

    this.before("READ", "Incidents", (req) => incidentLogic.advancedSearch(req));
    this.before("closeIncident", (req) => incidentLogic.checkIncident(req));
    this.on("closeIncident", (req) => incidentLogic._closeIncident(req));
    this.on("reopenIncident", (req) => incidentLogic._reopenIncident(req));
    this.before("assignIncident", (req) => incidentLogic.checkAssignIncident(req));
    this.on("assignIncident", (req) => incidentLogic._assignIncident(req));
    this.on("ReportIncidentAction", (req) => incidentLogic._reportIncidentAction(req));
    this.on("runScheduledJob", (req) => _runScheduledJob(req));

    return super.init();
  }
}

module.exports = IncidentService;
