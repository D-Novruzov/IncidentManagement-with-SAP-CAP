/**
 * IncidentService: CAP service handlers wiring for incident operations.
 * Registers before/on handlers and delegates to logic layer.
 */
const cds = require("@sap/cds");


const { _assignIncident, _closeIncident, _reportIncidentAction, _reopenIncident, checkIncident, checkAssignIncident, advancedSearch } = require('./lib/incident-logic')
const  {_runScheduledJob} = require('./lib/jobs')



/** Service implementation for Incident operations. */
class IncidentService extends cds.ApplicationService {
  async init() {
    const entities = this.entities;
    
    this.before('READ', 'Incidents', async(req) => advancedSearch(req))
    this.before("closeIncident", async (req) => await checkIncident(req, entities));

    this.on("closeIncident", async (req) => await _closeIncident(req, entities));
    
    this.on('reopenIncident', async (req) => await _reopenIncident(req, entities));
    
    this.before("assignIncident", async (req) => await checkAssignIncident(req, entities));
    
    this.on("assignIncident", async (req) => await _assignIncident(req, entities));
    
    this.on("ReportIncidentAction", async (req) => await _reportIncidentAction(req, entities));
    
    this.on("runScheduledJob", async (req) => await _runScheduledJob(req));
    return super.init();
  }


}

module.exports = IncidentService;
