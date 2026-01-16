module.exports = {
    PRIORITY_BY_TYPE: {
      "SYSTEM_OUTAGE": "CRITICAL",
      "API_FAILURE": "HIGH",
      "LOGIN_PROBLEM": "HIGH",
      "PERFORMANCE_ISSUE": "MEDIUM",
      "APPLICATION_ERROR": "MEDIUM",
      "DATA_SYNC_ISSUE": "MEDIUM"
    },
    
    SLA_DURATION_HOURS: {
      "CRITICAL": 4,
      "HIGH": 24,
      "MEDIUM": 72,
      "LOW": 168
    }
  };