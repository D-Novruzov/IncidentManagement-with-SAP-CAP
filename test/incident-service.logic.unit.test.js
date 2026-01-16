// Mock functions - will be used by the fake repository
const mockFindReportById = jest.fn();
const mockCloseIncident = jest.fn();
const mockCreateResolveTime = jest.fn();
const mockFindIncidentById = jest.fn();
const mockReopenIncident = jest.fn();
const mockFindUserById = jest.fn();
// Replace IncidentRepository with a fake that uses our mock functions
jest.mock("../srv/incident-service/lib/incident-repository", () => ({
  IncidentRepository: jest.fn().mockImplementation(() => ({
    findReportById: mockFindReportById,
    closeIncident: mockCloseIncident,
    createResolveTime: mockCreateResolveTime,
    findIncidentById: mockFindIncidentById,
    reopenIncident: mockReopenIncident,
    findUserById: mockFindUserById,
  })),
}));

// Prevent audit logger from causing errors
jest.mock("../srv/utils/audit-logger", () => ({
  createAuditLogger: () => jest.fn().mockResolvedValue(undefined),
}));

const {
  _closeIncident,
  checkIncident,
  _reopenIncident,
  checkAssignIncident,
} = require("../srv/incident-service/lib/incident-logic");

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
      "incidentId is required"
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
      "incidentId is required"
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
      "There is no incident with this id"
    );
    expect(mockFindIncidentById).toHaveBeenCalledWith(req.data.incidentId);
  });
  test("should throw error if incident  is not closed", async () => {
    const req = { data: { incidentId: "ADB:213" } };
    mockFindIncidentById.mockResolvedValue({ status: "OPEN" });

    await expect(_reopenIncident(req, {})).rejects.toThrow(
      "To reopen the incident it should be closed"
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
});
