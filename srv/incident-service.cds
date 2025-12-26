using my.incidents as my from '../db/schema';

service IncidentService {
    @odata.draft.enabled
    entity Incidents as projection on my.Incident;
    
    // Renamed to avoid name collision with the action `reportIncident`
    entity ReportIncidentEntity as projection on my.ReportIncident;
    
    @readonly
    entity Category as projection on my.IncidentCategory;
    @requires: 'admin'
    entity UserReference as projection on my.UserReference;
    
    @requires: 'admin'
    entity Customer as projection on my.Customer;


    entity AuditLog as projection on my.AuditLog;
    

    action runScheduledJob();
    
    action closeIncident(incidentId: String) returns {ID: String; status: String };
    
    action assignIncident(incidentID: UUID, userId: String);
    
    // Renamed action to avoid collisions and expose a clear OData path
    action ReportIncidentAction(incidentID: UUID, title: String, description: String, type: my.IncidentType, customer: UUID) returns {
      ID: UUID;
      title: String;
      description: String;
      type: my.IncidentType;
      customer: UUID;
      message: String;
    };

    function incidentStats() returns {
        totalIncidents: Integer;
        openIncidents: Integer;
        closedIncidents: Integer;
        isConsistent: Boolean;
    };
}