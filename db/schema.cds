using { managed, Country } from '@sap/cds/common';

namespace my.incidents;


@odata.draft.enabled
entity Incident : managed {
  key ID          : UUID;
  title           : String(100) @mandatory;
  description     : localized String(500);

  status          : Status @mandatory;
  priority        : Priority @mandatory;

  category        : Association to IncidentCategory @mandatory;
  country         : Country; 

  assigedTo       : Association to UserReference;
}

entity IncidentCategory {
  key code        : String(10);
  name            : localized String(100);
  description     : String(255);
  isActive        : Boolean default true;
}

entity AuditLog : managed {
  key ID          : UUID;
  entityType      : String(50);
  entityKey       : UUID;

  action          : Action;
  fieldChanged    : String(50);
  oldValue        : String;
  newValue        : String;
}

entity UserReference {
  key userId      : String;
  email           : String(100) @mandatory;
  displayName     : String(100);
}

type Status : String enum {
  OPEN;
  IN_PROGRESS;
  CLOSED
};

type Priority : String enum {
  LOW;
  MEDIUM;
  HIGH;
  CRITICAL
};

type Action : String enum {
  CREATE;
  UPDATE;
  CLOSE
};