using my.incidents as my from '../db/schema';

service IncidentService {
    entity Incidents as projection on my.Incident;
    @readonly
    entity Category as projection on my.IncidentCategory;
    entity User as projection on my.UserReference;
    
    action closeIncident(incidentId: String);
    action assignIncident(incidentID: UUID, userId: String);

    function incidentStats() returns {
        totalIncidents: Integer;
        openIncidents: Integer;
        closedIncidents: Integer;
    };
}