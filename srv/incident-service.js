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
    const { incidentId } = req.data

    if (!incidentId) {
      return req.error(400, 'incidentId is required')
    }

    const incident = await SELECT.one
      .from(Incidents)
      .where({ ID: incidentId })

    if (!incident) {
      return req.error(404, 'Incident not found')
    }

    if (incident.status === 'CLOSED') {
      return req.error(400, 'Incident is already closed')
    }

    await UPDATE(Incidents)
      .set({ status: 'CLOSED' })
      .where({ ID: incidentId })

    return { ID: incidentId, status: 'CLOSED' }
  }

 
  async assignIncident(req) {
    const { Incidents } = this.entities
    const { incidentId } = req.data

    if (!incidentId) {
      return req.error(400, 'incidentId is required')
    }

    const incident = await SELECT.one
      .from(Incidents)
      .where({ ID: incidentId })

    if (!incident) {
      return req.error(404, 'Incident not found')
    }

    await UPDATE(Incidents)
      .set({ status: 'IN_PROGRESS' })
      .where({ ID: incidentId })

    return { ID: incidentId, status: 'IN_PROGRESS' }
  }


  async incidentStats() {
    const { Incidents } = this.entities

    const total = await SELECT.one
      .from(Incidents)
      .columns`count(*) as count`

    const open = await SELECT.one
      .from(Incidents)
      .where({ status: 'OPEN' })
      .columns`count(*) as count`

    const closed = await SELECT.one
      .from(Incidents)
      .where({ status: 'CLOSED' })
      .columns`count(*) as count`

    return {
      totalIncidents: total.count,
      openIncidents: open.count,
      closedIncidents: closed.count
    }
  }
}

module.exports = IncidentService
