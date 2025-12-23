const cds = require("@sap/cds");
const LOG = cds.log("incident-service");

class IncidentService extends cds.ApplicationService {
  async init() {
    this.on("closeIncident", this.closeIncident);
    this.on("assignIncident", this.assignIncident);
    this.on("incidentStats", this.incidentStats);
    return super.init();
  }

  async closeIncident(req) {
    const { Incidents } = this.entities;

    const incidentId = req.data?.incidentId || req;

    if (!incidentId) {
      throw cds.error({ code: 400, message: "incidentId is required" });
    }

    const incident = await SELECT.one.from(Incidents).where({ ID: incidentId });

    if (!incident) {
      throw cds.error({ code: 404, message: "Incident not found" });
    }

    if (incident.status === "CLOSED") {
      throw cds.error({ code: 400, message: "Incident is already closed" });
    }

    await UPDATE(Incidents).set({ status: "CLOSED" }).where({ ID: incidentId });

    return { ID: incidentId, status: "CLOSED" };
  }

  async assignIncident(req) {
    const { Incidents, User } = this.entities;
    console.log("Raw Express Body:", req._.req.body);
    console.log("req.data:", req.data);

    const { incidentID, userId } = req.data || {};

    if (!incidentID) {
      throw cds.error({ code: 400, message: "incidentID is required" });
    }

    if (!userId) {
      throw cds.error({ code: 400, message: "userId is required" });
    }

    const incident = await SELECT.one.from(Incidents).where({ ID: incidentID });

    if (!incident) {
      throw cds.error({ code: 404, message: "Invalid incident id" });
    }

    if (incident.status === "CLOSED") {
      throw cds.error({ code: 400, message: "Incident is already closed" });
    }

    const user = await SELECT.one.from(User).where({ userId: userId });

    if (!user) {
      throw cds.error({ code: 404, message: "Invalid user id" });
    }

    if (incident.assignedTo_userId) {
      throw cds.error({
        code: 403,
        message: "Incident is already assigned to user",
      });
    }

    await UPDATE(Incidents)
      .set({ assignedTo_userId: userId })
      .where({ ID: incidentID });

    LOG.info("Incident Assigned successfully", {
      incidentID,
      assignedTo: userId,
      entity: "Incidents",
      caller: req.user?.id,
    });
  }

  async incidentStats() {
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

    LOG.info("Incidents stats retrieved", {
      entity: "Incidents",
    });
    return {
      totalIncidents,
      openIncidents,
      closedIncidents,
    };
  }
}

module.exports = IncidentService;
