const cds = require('@sap/cds')


class IncidentService extends cds.ApplicaitonService {


    init() {
        this.on('closeIncident', (req) => this.closeIncident(req))
        this.on('assignIncident', (req) => this.assignIncident(req))
        this.on('incidentStats', (req) => this.incidentStats(req))
        return super.init()
    }

    async closeIncident(req) {
        const {Incident } = this.entities
        const currentIncident  = Selection.from(Incident).where({ID: req.data.incidentID})
        if(!currentIncident) req.error(400, "Invalid data provided")
        if(currentIncident.status == 'CLOSED'
        ) return req.error(404, 'Incident should be open to be able to close it')
        await UPDATE(Incident).set({status: 'CLOSED'}).where({ID: incidentID})
    }

 

}

module.exports = IncidentService
