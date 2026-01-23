jest.setTimeout(30000);
const cds = require("@sap/cds");

const { GET } = cds.test(__dirname + "/../..");

describe("ReportService integration", () => {
  describe("incidentStats", () => {
    test("should correctly return incident stats", async () => {
      const response = await GET("/reports/incidentStats()");
      expect(response.status).toBe(200);
    });
  });
  describe("avgResolutionTimeByType", () => {
    test("should correctly return resolution time by type", async () => {
      const response = await GET("/reports/avgResolutionTimeByType()");
      expect(response.status).toBe(200);
    });
  });
  describe("incidentsByPriority", () => {
    test("should correctly return incidents by priority", async () => {
      const response = await GET("/reports/incidentsByPriority()");
      expect(response.status).toBe(200);
    });
  });
});
