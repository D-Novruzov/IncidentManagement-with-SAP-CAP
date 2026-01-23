const cds = require("@sap/cds");

class ReportRepository {
  constructor(entities) {
    this.Incidents = entities.Incidents;
    this.IncidentResolveTime = entities.IncidentResolveTime;
  }

  async totalIncidents() {
    const result = await cds.run(
      SELECT.from(this.Incidents).columns([
        { func: "count", args: [{ ref: ["ID"] }], as: "count" },
      ]),
    );
    return result[0].count;
  }
  async openIncidents() {
    const result = await cds.run(
      SELECT.from(this.Incidents)
        .where({ status: "OPEN" })
        .columns([{ func: "count", args: [{ ref: ["ID"] }], as: "count" }]),
    );
    return result[0].count;
  }
  async closedIncidents() {
    const result = await cds.run(
      SELECT.from(this.Incidents)
        .where({ status: "CLOSED" })
        .columns([{ func: "count", args: [{ ref: ["ID"] }], as: "count" }]),
    );
    return result[0].count;
  }
  async avgResolutionTimeByType() {
    const result = await cds.run(
      SELECT.from(this.IncidentResolveTime)
        .columns([
          { ref: ["incidentType"], as: "IncidentType" },
          { func: "count", args: [{ ref: ["ID"] }], as: "count" },
          { func: "avg", args: [{ ref: ["timeSpent"] }], as: "avgTime" },
        ])
        .groupBy("incidentType"),
    );
    return result;
  }
  async incidentsByPriority() {
    const result = await cds.run(
      SELECT.from(this.Incidents)
        .where({ status: "OPEN" })
        .columns([
          { ref: ["priority"], as: "Priority" },
          { func: "count", args: [{ ref: ["ID"] }], as: "count" },
        ])
        .groupBy("priority"),
    );
    return result;
  }
}
module.exports = { ReportRepository };
