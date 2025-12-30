using my.incidents as my from '../db/schema';

service IncidentService {
  @odata.draft.enabled
  entity Incidents            as projection on my.Incident;


  entity ReportIncidentEntity as projection on my.ReportIncident;


  @requires: 'admin'
  entity IncidentResolveTime  as projection on my.IncidentResolveTime;
  annotate IncidentResolveTime with @(requires: 'admin');


  entity Category             as projection on my.IncidentCategory;
  annotate Category with @readonly;
  
  
  entity UserReference        as projection on my.UserReference;
  annotate UserReference with @(requires: 'admin');
 
  entity Customer             as projection on my.Customer;
  annotate Customer with @(requires: 'admin');
  

  entity AuditLog             as projection on my.AuditLog;


  action   runScheduledJob();

  action   closeIncident(incidentId: String)                                                                                 returns {
    ID     : String;
    status : String
  };

  action   reassignIncident(incidentID: UUID, userId: String);
  action   reassingIncident(incidentID: UUID, userId: String);

  action   ReportIncidentAction(incidentID: UUID, title: String, description: String, type: my.IncidentType, customer: UUID) returns {
    ID          : UUID;
    title       : String;
    description : String;
    type        : my.IncidentType;
    customer    : UUID;
    date        : Date;
    message     : String;
  };

  function incidentStats()                                                                                                   returns {
    totalIncidents  : Integer;
    openIncidents   : Integer;
    closedIncidents : Integer;
    isConsistent    : Boolean;
  };

  function avgResolutionTimeByType() returns  array of {
    incidentType: my.IncidentType;
    count: Integer;
    avgTime: Integer;
  }
  
}
