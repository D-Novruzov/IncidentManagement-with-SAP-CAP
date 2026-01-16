const cds = require('@sap/cds');



class  ReportRepository {
    constructor(entities) {
        this.Incidents = entities.Incidents;
        this.IncidentResolveTime = entities.IncidentResolveTime;
    }

    async totalIncident() {
         const [{ count: totalIncidents }] = await SELECT.from(this.Incidents).columns([
            { func: "count", args: [{ ref: ["ID"] }], as: "count" },
          ]);
          return totalIncidents;
    }
    async openIncidents() {
        const[{ count: openIncidents }] =  await SELECT.from(this.Incidents)
        .where({ status: "OPEN" })
        .columns([{ func: "count", args: [{ ref: ["ID"] }], as: "count" }]);
        return openIncidents
    }
    async closedIncidents() {
        const [{ count: closedIncidents }] = await SELECT.from(this.Incidents)
        .where({ status: "CLOSED" })
        .columns([{ func: "count", args: [{ ref: ["ID"] }], as: "count" }]);
        return closedIncidents
    }
    async avgResolutionTimeByType () {
        const result = await SELECT.from(this.IncidentResolveTime)
            .columns([
            { ref: ["incidentType"], as: "IncidentType" },
            { func: "count", args: [{ ref: ["ID"] }], as: "count" },
            { func: "avg", args: [{ ref: ["timeSpent"] }], as: "avgTime" },
            ])
            .groupBy("incidentType");
        return result
    }
    async incidentsByPriority() {
        const result = await SELECT.from(this.Incidents)
        .where({ status: "OPEN" })
        .columns([
            { ref: ["priority"], as: "Priority" }, 
            { func: "count", args: [{ ref: ["ID"] }], as: "count" }
        ])
        .groupBy("priority");
        return result
    }
        
    }

    module.exports  = ReportRepository