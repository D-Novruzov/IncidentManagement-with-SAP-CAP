const mockFindReportById = jest.fn();
const mockCloseIncident = jest.fn();
const mockCreateResolveTime = jest.fn();
const mockFindIncidentById = jest.fn();
const mockReopenIncident = jest.fn();
const mockFindUserById = jest.fn();
const mockFindIncidentForUpdate = jest.fn();
const mockAssignIncident = jest.fn();
const mockAssignIncidentById = jest.fn();
const mockCreateReport = jest.fn();
const mockCreateIncident = jest.fn();
// Replace IncidentRepository with a fake that uses our mock functions
jest.mock("../srv/incident-service/lib/incident-repository", () => ({
  IncidentRepository: jest.fn().mockImplementation(() => ({
    findReportById: mockFindReportById,
    closeIncident: mockCloseIncident,
    createResolveTime: mockCreateResolveTime,
    findIncidentById: mockFindIncidentById,
    reopenIncident: mockReopenIncident,
    findUserById: mockFindUserById,
    findIncidentForUpdate: mockFindIncidentForUpdate,
    assignIncident: mockAssignIncident,
    assignIncidentById: mockAssignIncidentById,
    createReport: mockCreateReport,
    createIncident: mockCreateIncident,
  })),
}));

// Prevent audit logger from causing errors
jest.mock("../srv/utils/audit-logger", () => ({
  createAuditLogger: () => jest.fn().mockResolvedValue(undefined),
}));

// Mock cds.tx after loading
const cds = require("@sap/cds");
cds.tx = jest.fn((req, callback) => Promise.resolve(callback({})));

const {
  _closeIncident,
  checkIncident,
  _reopenIncident,
  checkAssignIncident,
  _assignIncident,
  _reportIncidentAction,
} = require("../srv/incident-service/lib/incident-logic");
const { message } = require("@sap/cds/lib/log/cds-error");

describe("_closeIncident", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should close incident successfully", async () => {
    mockFindReportById.mockResolvedValue({
      ID: "inc-123",
      status: "OPEN",
      type: "BUG",
      createdAt: new Date().toISOString(),
    });
    mockCloseIncident.mockResolvedValue({});
    mockCreateResolveTime.mockResolvedValue({});

    const req = { data: { incidentId: "inc-123" } };
    const result = await _closeIncident(req, {});

    expect(result.status).toBe("CLOSED");
    expect(result.ID).toBe("inc-123");
    expect(mockCloseIncident).toHaveBeenCalled();
  });

  test("should throw 400 if incidentId is missing", async () => {
    const req = { data: {} };

    await expect(_closeIncident(req, {})).rejects.toThrow(
      "incidentId is required",
    );
  });
});
describe("_checkIncident", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test("should check if the incident is in database", async () => {
    mockFindIncidentById.mockResolvedValue({
      status: "OPEN",
    });

    const req = { data: { incidentId: "inc-123" } };
    const result = await checkIncident(req, {});

    // checkIncident returns undefined on success (no return statement)
    expect(result).toBeUndefined();
    expect(mockFindIncidentById).toHaveBeenCalledWith("inc-123");
  });
  test("should throw error if incidentId is not provided", async () => {
    const req = { data: {} };

    await expect(checkIncident(req, {})).rejects.toThrow(
      "incidentId is required",
    );
  });
  test("should throw error if incident not found in database", async () => {
    mockFindIncidentById.mockResolvedValue(null); // Returns null = not found

    const req = { data: { incidentId: "abc-123" } };

    await expect(checkIncident(req, {})).rejects.toThrow("Incident not found");
  });
});
describe("_reopenIncident", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should reopen closed incident", async () => {
    mockFindIncidentById.mockResolvedValueOnce({
      status: "CLOSED",
      slaDuration: 4,
    });

    mockFindIncidentById.mockResolvedValueOnce({
      status: "OPEN",
    });

    mockReopenIncident.mockResolvedValue({});

    const req = { data: { incidentId: "abd-123" } };
    const result = await _reopenIncident(req, {});

    expect(result).toEqual({ ID: "abd-123", status: "OPEN" });
  });
  test("should throw error if incidentId is invalid", async () => {
    const req = { data: { incidentId: "ADB:213" } };
    mockFindIncidentById.mockResolvedValue(null);

    await expect(_reopenIncident(req, {})).rejects.toThrow(
      "There is no incident with this id",
    );
    expect(mockFindIncidentById).toHaveBeenCalledWith(req.data.incidentId);
  });
  test("should throw error if incident  is not closed", async () => {
    const req = { data: { incidentId: "ADB:213" } };
    mockFindIncidentById.mockResolvedValue({ status: "OPEN" });

    await expect(_reopenIncident(req, {})).rejects.toThrow(
      "To reopen the incident it should be closed",
    );
    expect(mockFindIncidentById).toHaveBeenCalledWith(req.data.incidentId);
  });
});
describe("checkAssignIncident", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should not return anything if incident is not assigned to someone", async () => {
    const req = {
      data: {
        incidentID: "abd-123",
        userId: "abcd-123",
      },
    };
    mockFindIncidentById.mockResolvedValue({
      status: "OPEN",
      assignedTo_userId: null,
    });
    mockFindUserById.mockResolvedValue({});

    const result = await checkAssignIncident(req, {});
    expect(result).toBeUndefined();
  });
  test("should throw an error if the incindentID is not sent", async () => {
    const req = { data: { userId: "abcd-123" } };
    await expect(checkAssignIncident(req, {})).rejects.toThrow(
      "incidentID is required",
    );
  });
  test("should throw an error if the userId is not sent", async () => {
    const req = { data: { incidentID: " asbnsd=12" } };
    await expect(checkAssignIncident(req, {})).rejects.toThrow(
      "userId is required",
    );
  });
  test("should throw an error if the incident id is not valid", async () => {
    const req = { data: { userId: "abcd-123", incidentID: " asbnsd=12" } };
    mockFindIncidentById.mockResolvedValue(null);
    await expect(checkAssignIncident(req, {})).rejects.toThrow(
      "Invalid incident id",
    );
  });
  test("should throw an error if the incident is closed", async () => {
    const req = { data: { userId: "abcd-123", incidentID: " asbnsd=12" } };
    mockFindIncidentById.mockResolvedValue({ status: "CLOSED" });
    await expect(checkAssignIncident(req, {})).rejects.toThrow(
      "Incident is already closed",
    );
  });
  test("should throw an error if the incident is assigned", async () => {
    const req = { data: { userId: "abcd-123", incidentID: " asbnsd=12" } };
    mockFindIncidentById.mockResolvedValue({ assignedTo_userId: "abs=123" });
    await expect(checkAssignIncident(req, {})).rejects.toThrow(
      "Incident is already assigned to user",
    );
  });
  test("should throw an error if the userId is not valid", async () => {
    const req = { data: { userId: "abcd-123", incidentID: " asbnsd=12" } };
    mockFindIncidentById.mockResolvedValue({});
    mockFindUserById.mockResolvedValue(null);
    await expect(checkAssignIncident(req, {})).rejects.toThrow(
      "Invalid user id",
    );
  });
});

describe("_assignIncident", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test("should assign incident to a user", async () => {
    const req = { data: { userId: "abcd-123", incidentID: " asbnsd=12" } };
    mockFindIncidentById.mockResolvedValue({});
    mockAssignIncidentById.mockResolvedValue({});
    const result = await _assignIncident(req, {});
    expect(result).toBeUndefined();
  });
  test("should throw error if the assignIncident is not found", async () => {
    const req = { data: { userId: "abcd-123", incidentID: " asbnsd=12" } };
    mockFindIncidentById.mockResolvedValue(null);
    await expect(_assignIncident(req, {})).rejects.toThrow(
      "Incident not found",
    );
  });
});
describe("_reportIncidentAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test("should successfully report incident into tables", async () => {
    const req = {
      data: {
        incidentID: "abc-12",
        title: "log in error",
        description: "there is a log in error on tha main page",
        type: "SYSTEM_OUTAGE",
        customer: "sda",
      },
    };
    mockFindReportById.mockResolvedValue(null);
    mockCreateReport.mockResolvedValue({});
    mockCreateIncident.mockResolvedValue({});
    mockFindIncidentById.mockResolvedValue({});
    const result = await _reportIncidentAction(req, {});
    expect(result).toEqual({
      ID: req.data.incidentID,
      message: "Incident Successfully reported",
    });
  });
  test("should return a message if the report incident already exists", async () => {
    const req = {
      data: {
        incidentID: "abc-12",
        title: "log in error",
        description: "there is a log in error on tha main page",
        type: "SYSTEM_OUTAGE",
        customer: "sda",
      },
    };
    mockFindReportById.mockResolvedValue({});
    mockCreateReport.mockResolvedValue({});
    mockCreateIncident.mockResolvedValue({});
    mockFindIncidentById.mockResolvedValue({});
    const result = await _reportIncidentAction(req, {});
    expect(result).toEqual({
      ID: req.data.incidentID,
      message: "Report Incident already exists",
    });
  });

  test("should throw error if incidentID is missing", async () => {
    const req = {
      data: {
        title: "log in error",
        description: "there is a log in error on tha main page",
        type: "SYSTEM_OUTAGE",
      },
    };
    await expect(_reportIncidentAction(req, {})).rejects.toThrow(
      "incidentID is required",
    );
  });

  test("should throw error if title is missing", async () => {
    const req = {
      data: {
        incidentID: "abc-12",
        description: "there is a log in error on tha main page",
        type: "SYSTEM_OUTAGE",
      },
    };
    await expect(_reportIncidentAction(req, {})).rejects.toThrow(
      "title is required",
    );
  });

  test("should throw error if description is missing", async () => {
    const req = {
      data: {
        incidentID: "abc-12",
        title: "log in error",
        type: "SYSTEM_OUTAGE",
      },
    };
    await expect(_reportIncidentAction(req, {})).rejects.toThrow(
      "description is required",
    );
  });

  test("should throw error if type is missing", async () => {
    const req = {
      data: {
        incidentID: "abc-12",
        title: "log in error",
        description: "there is a log in error on tha main page",
      },
    };
    await expect(_reportIncidentAction(req, {})).rejects.toThrow(
      "type is required",
    );
  });

  test("should throw PERSIST_FAILED error if incident verification fails", async () => {
    const req = {
      data: {
        incidentID: "abc-12",
        title: "log in error",
        description: "there is a log in error on tha main page",
        type: "SYSTEM_OUTAGE",
        customer: "sda",
      },
    };
    mockFindReportById.mockResolvedValue(null);
    mockCreateReport.mockResolvedValue({});
    mockCreateIncident.mockResolvedValue({});
    mockFindIncidentById.mockResolvedValue(null);

    await expect(_reportIncidentAction(req, {})).rejects.toThrow(
      "PERSIST_FAILED",
    );
  });

  test("should throw PERSIST_FAILED error if createReport fails", async () => {
    const req = {
      data: {
        incidentID: "abc-12",
        title: "log in error",
        description: "there is a log in error on tha main page",
        type: "SYSTEM_OUTAGE",
        customer: "sda",
      },
    };
    mockFindReportById.mockResolvedValue(null);
    mockCreateReport.mockRejectedValue(new Error("Database error"));

    await expect(_reportIncidentAction(req, {})).rejects.toThrow(
      "PERSIST_FAILED",
    );
  });
});
