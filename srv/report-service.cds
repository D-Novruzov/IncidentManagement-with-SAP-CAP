
using my.incidents as my from '../db/schema';


service ReportService @(path: '/reports') {

    entity Incidents as projection on my.Incident;
    entity IncidentResolveTime as projection on my.IncidentResolveTime;

    function incidentStats()                                                                                                   returns {
    totalIncidents  : Integer;
    openIncidents   : Integer;
    closedIncidents : Integer;
    isConsistent    : Boolean;
  };

  function avgResolutionTimeByType()                                                                                         returns array of {
    incidentType : my.IncidentType;
    count        : Integer;
    avgTime      : Integer;
  }
  function incidentsByPriority() returns array of {
    priority: my.Priority;
    count: Integer;
  }
}