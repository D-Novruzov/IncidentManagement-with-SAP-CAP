const cds = require('@sap/cds')
const  LOG = cds.log('incident-service')

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
    LOG.info('Incident Closed successfully', {
        incidentID, 
        entity: 'Incidents',
        caller: req.user.id 
    })
    return {
      message: 'Incident closed successfully',
      ID: incidentID
    }
  }
  async assignIncident(req) {

    const { Incidents, User } = this.entities

    const {incidentID, userID} = req.data

    if (!incidentID) {
        return req.error(400, 'incidentID is required')
      }

    if (!userID) {
        return req.error(400, 'userID is required')
      }

    const incident = await SELECT.one.from(Incidents).where({ID: incidentID})

    if (!incident) {
        return req.error(404, 'Invalid incident id')
      }
      
    if (incident.status === 'CLOSED') {
        return req.error(400, 'Incident is already closed')
      }

    const user =  await SELECT.one.from(User).where({userId: userID})

    if(!user) return req.error(404, 'Invalid user id')

    if (incident.assignedTo_userId) return req.error(403, 'Incident is alrady assigned to user')
    else {

        await UPDATE(Incidents).set({ assignedTo_userId: userID }).where({ ID: incidentID });
        LOG.info('Incident Assigned successfully', {
            incidentID,
            assignedTo: userID, 
            entity: 'Incidents',
            caller: req.user.id 
        })
    }
  }

  async incidentStats() {
    const { Incidents } = this.entities

    const [{ count: totalIncidents }] = await SELECT
      .from(Incidents)
      .columns([
        { func: 'count', args: [{ ref: ['ID'] }], as: 'count' }
      ])

    const [{ count: openIncidents }] = await SELECT
      .from(Incidents)
      .where({ status: 'OPEN' })
      .columns([
        { func: 'count', args: [{ ref: ['ID'] }], as: 'count' }
      ])

    const [{ count: closedIncidents }] = await SELECT
      .from(Incidents)
      .where({ status: 'CLOSED' })
      .columns([
        { func: 'count', args: [{ ref: ['ID'] }], as: 'count' }
      ])

    LOG.info('Incidents stats retrieved', {
        entity: 'Incidents'
    })
    return {
        totalIncidents,
        openIncidents,
        closedIncidents
    }
  }

}

module.exports = IncidentService
