const cds = require("@sap/cds");
const IncidentService = require("./incident-service");
const LOG = cds.log("incident-service");

const incidentServiceInstant = new IncidentService();
class ReportService extends cds.ApplicationService {
  async init() {
    this.on("incidentStats", this._incidentStats);
    this.on("avgResolutionTimeByType", this._avgResolutionTimeByType);
    this.on("incidentsByPriority", this._incidentsByPriority);
    return super.init();
  }

  async _incidentStats() {
    console.log("req heat");
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

  async _avgResolutionTimeByType() {
    const { IncidentResolveTime } = this.entities;
    const result = await SELECT.from(IncidentResolveTime)
      .columns([
        "IncidentType",
        { func: "count", args: [{ ref: ["ID"] }], as: "count" },
        { func: "avg", args: [{ ref: ["timeSpent"] }], as: "avgTime" },
      ])
      .groupBy("incidentType");
    const incidentService = await cds.connect.to("IncidentService");
    await incidentService.auditLogger(
      IncidentResolveTime,
      null,
      "GET",
      null,
      null,
      null
    );
    return result;
  }

  async _incidentsByPriority() {
    const { Incidents } = this.entities;
    const result = await SELECT.from(Incidents)
      .where({ status: "OPEN" })
      .columns(['priority as Priority', { func: "count", args: [{ ref: ["ID"] }], as: "count" }])
      .groupBy("priority");
    const incidentService = await cds.connect.to("IncidentService");
    await incidentService.auditLogger(
      Incidents,
      null,
      "GET",
      null,
      null,
      null
    );
    return result;
  }
}

module.exports = ReportService;
