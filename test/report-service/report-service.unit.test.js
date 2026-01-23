const mockTotalIncidents = jest.fn();
const mockOpenIncidents = jest.fn();
const mockClosedIncidents = jest.fn();
const mockAvgResolutionTimeByType = jest.fn();
const mockIncidentsByPriority = jest.fn();

jest.mock("../../srv/report-service/lib/report-repository", () => ({
  ReportRepository: jest.fn().mockImplementation(() => ({
    totalIncidents: mockTotalIncidents,
    openIncidents: mockOpenIncidents,
    closedIncidents: mockClosedIncidents,
    avgResolutionTimeByType: mockAvgResolutionTimeByType,
    incidentsByPriority: mockIncidentsByPriority,
  })),
}));

jest.mock("../../srv/utils/audit-logger", () => ({
  createAuditLogger: () => jest.fn().mockResolvedValue(undefined),
}));

const cds = require("@sap/cds");
cds.tx = jest.fn((req, callback) => Promise.resolve(callback({})));

const ReportLogic = require("../../srv/report-service/lib/report-logic");
const { expected } = require("@sap/cds/lib/log/cds-error");

let logic;
beforeEach(() => {
  logic = new ReportLogic();
});

describe("incidentStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return incident statistics, with total, open, closed incidents", async () => {
    const req = {};
    mockTotalIncidents.mockResolvedValue(10);
    mockOpenIncidents.mockResolvedValue(3);
    mockClosedIncidents.mockResolvedValue(7);
    const result = await logic.incidentStats(req);
    expect(result).toEqual({
      totalIncidents: 10,
      openIncidents: 3,
      closedIncidents: 7,
      isConsistent: true,
    });
  });
});

describe("avgResolutionTimeByType", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test("shuold correctly show the average resolution time by type", async () => {
    mockAvgResolutionTimeByType.mockResolvedValue({ result: { length: 12 } });
    const response = await logic.avgResolutionTimeByType();
    expect(response.result.length).toBe(12);
  });
});
describe("incidentsByPriority", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test("should return incidents by priority", async () => {
    mockIncidentsByPriority.mockResolvedValue({ result: { length: 12 } });
    const response = await logic.incidentsByPriority();
    expect(response.result.length).toBe(12);
  });
});
