using {
  managed,
  Country
} from '@sap/cds/common';

namespace my.incidents;


@odata.draft.enabled
entity Incident : managed {
  key ID          : Association to ReportIncident;
      title       : String(100)                     @mandatory;
      description : localized String(500);

      status      : Status                          @mandatory;
      priority    : Priority                        @mandatory;

      category    : Association to IncidentCategory @mandatory;
      country     : Country;

      assignedTo  : Association to UserReference;
      slaDuration: Integer;
      slaStartTime : Integer;
      slaDueDate : Integer;
      slaStatusL: String;
      slaBreachedAt: Timestamp;
      resolvedAt  : Date
}

entity IncidentResolveTime : managed {
  key ID           : UUID;
      incidentID   : Association to Incident @mandatory;
      incidentType : IncidentType;
      timeSpent    : Integer;
}

entity ReportIncident : managed {
  key ID          : UUID;
      title       : String       @mandatory;
      description : String       @mandatory;
      type        : IncidentType @mandatory;
      customer    : Association to Customer;
}

entity Customer : managed {
  key ID             : UUID;
      customerNumber : String(50);
      firstname      : String(100) @mandatory;
      lastname       : String(100) @mandatory;
      email          : String(100) @mandatory;
      phone          : String(20);
      company        : String(200);
      country        : Country;
      isPremium      : Boolean default false;
}

entity IncidentCategory {
  key code        : String(10);
      name        : localized String(100);
      description : String(255);
      isActive    : Boolean default true;
}

entity AuditLog : managed {
  key ID           : UUID;
      entityType   : String(50);
      entityKey    : UUID;
      action       : Action;
      fieldChanged : String(50);
      oldValue     : String;
      newValue     : String;
}

entity UserReference {
  key userId      : String;
      email       : String(100) @mandatory;
      displayName : String(100);
}

type IncidentType : String enum {
  SYSTEM_OUTAGE;
  APPLICATION_ERROR;
  PERFORMANCE_ISSUE;
  LOGIN_PROBLEM;
  API_FAILURE;
  DATA_SYNC_ISSUE;
}

type Status       : String enum {
  OPEN;
  IN_PROGRESS;
  CLOSED
};

type Priority     : String enum {
  LOW;
  MEDIUM;
  HIGH;
  CRITICAL
};

type Action       : String enum {
  CREATE;
  UPDATE;
  CLOSE
};
