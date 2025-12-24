using my.incidents as my from '../db/schema';

service IncidentService {
    entity Incidents as projection on my.Incident;
    @readonly
    entity Category as projection on my.IncidentCategory;
    @(requires: 'admin') entity User as projection on my.UserReference;
    entity AuditLog as projection on my.AuditLog;
    action closeIncident(incidentId: String) returns {ID: String; status: String };
    action assignIncident(incidentID: UUID, userId: String);
    action cleanupClosedIncidents() returns {
        message: String;
        deletedCount: Integer;   };

    function incidentStats() returns {
        totalIncidents: Integer;
        openIncidents: Integer;
        closedIncidents: Integer;
    };
}