using my.incidents as my from '../db/schema';

service IncidentService {
    @odata.draft.enabled
    entity Incidents as projection on my.Incident;
    
    @readonly
    entity Category as projection on my.IncidentCategory;
    @requires: 'admin'
    entity User as projection on my.UserReference;
    
    entity AuditLog as projection on my.AuditLog;
    

    action runScheduledJob();
    
    action closeIncident(incidentId: String) returns {ID: String; status: String };
    
    action assignIncident(incidentID: UUID, userId: String);
    

    function incidentStats() returns {
        totalIncidents: Integer;
        openIncidents: Integer;
        closedIncidents: Integer;
        isConsistent: Boolean;
    };
}