const cds = require('@sap/cds')

class IncidentService extends cds.ApplicationService {

  async init() {
    this.on('closeIncident', this.closeIncident)
    this.on('assignIncident', this.assignIncident)
    this.on('incidentStats', this.incidentStats)
    return super.init()
  }

  async closeIncident(req) {
    const { Incidents } = this.entities
    const { incidentID } = req.data

    if (!incidentID) {
      return req.error(400, 'incidentID is required')
    }

    const incident = await SELECT.one
      .from(Incidents)
      .where({ ID: incidentID })

    if (!incident) {
      return req.error(404, 'Incident not found')
    }

    if (incident.status === 'closed') {
      return req.error(400, 'Incident must be open to be closed')
    }

    await UPDATE(Incidents)
      .set({ status: 'closed' })
      .where({ ID: incidentID })

    return {
      message: 'Incident closed successfully',
      ID: incidentID
    }
  }

}

module.exports = IncidentService
