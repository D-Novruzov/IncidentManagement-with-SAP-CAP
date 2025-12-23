const cds = require('@sap/cds')
const  LOG = cds.log('incident-service')

class IncidentService extends cds.ApplicationService {

  async init() {
    this.on('closeIncident', this.closeIncident)
    this.on('assignIncident', (req) => this.assignIncident(req))
    this.on('incidentStats', this.incidentStats)
    return super.init()
  }


  async closeIncident(req) {
    const { Incidents } = this.entities
    console.log(Incidents)
    console.log('this is req', req)
    const  incidentId  = req
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


    const { Incidents, User } = this.entities

    const {incidentID, userId} = req.data
    
    if (!incidentID) {
        return req.error(400, 'incidentID is required')
      }

    if (!userId) {
        return req.error(400, 'userId is required')
      }

    const incident = await SELECT.one.from(Incidents).where({ID: incidentID})

    if (!incident) {
        return req.error(404, 'Invalid incident id')
      }
      
    if (incident.status === 'CLOSED') {
        return req.error(400, 'Incident is already closed')
      }

    const user =  await SELECT.one.from(User).where({userId: userId})

    if(!user) return req.error(404, 'Invalid user id')

    if (incident.assignedTo_userId) return req.error(403, 'Incident is already assigned to user')
    else {

        await UPDATE(Incidents).set({ assignedTo_userId: userId }).where({ ID: incidentID });
        LOG.info('Incident Assigned successfully', {
            incidentID,
            assignedTo: userId, 
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
