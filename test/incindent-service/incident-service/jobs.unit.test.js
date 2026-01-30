const mockLog = { info: jest.fn(), error: jest.fn() };
const mockTx = { run: jest.fn(), entities: { Incidents: "Incidents" } };
const mockCds = {
  log: jest.fn(() => mockLog),
  spawn: jest.fn((ctx, cb) => cb(mockTx)),
};
jest.mock("@sap/cds", () => mockCds);


global.DELETE = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
};
global.SELECT = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  forUpdate: jest.fn().mockReturnThis(),
};
global.UPDATE = jest.fn(() => ({
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
}));

const {
  runScheduledJob,
  cleanupClosedIncidents,
  setSLAProperties,
  UpdateSlaStatus,
} = require("../../../srv/incident-service/lib/jobs");

describe("Scheduled Jobs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTx.run.mockReset();
    mockCds.spawn.mockImplementation((ctx, cb) => cb(mockTx));
  });

  describe("runScheduledJob", () => {
    it("executes successfully", async () => {
      mockTx.run.mockResolvedValueOnce(5).mockResolvedValueOnce([]);
      const result = await runScheduledJob({ tenant: "test" });
      expect(result).toEqual({ message: "Job started" });
      expect(mockLog.info).toHaveBeenCalledWith("Scheduled job triggered");
    });

    it("handles errors", async () => {
      mockCds.spawn.mockImplementationOnce(() => {
        throw new Error("fail");
      });
      await runScheduledJob({ tenant: "test" });
      expect(mockLog.error).toHaveBeenCalled();
    });
  });

  describe("cleanupClosedIncidents", () => {
    it("deletes closed incidents", async () => {
      mockTx.run.mockResolvedValue(3);
      const result = await cleanupClosedIncidents(mockTx);
      expect(result).toBe(3);
      expect(mockLog.info).toHaveBeenCalledWith(
        "Closed incidents cleanup completed",
        { deletedCount: 3 },
      );
    });
  });

  describe("setSLAProperties", () => {
    beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(1000000));
    afterEach(() => jest.restoreAllMocks());

    it("skips update when unchanged", async () => {
      mockTx.run.mockResolvedValue([
        {
          ID_ID: "1",
          slaStatus: "ONTRACK",
          slaDueDate: 2000000,
          slaDuration: 1,
          priority: "LOW",
          slaBreachedAt: null,
        },
      ]);
      await setSLAProperties(mockTx);
      expect(mockTx.run).toHaveBeenCalledTimes(1);
    });

    it("updates to BREACHED", async () => {
      mockTx.run
        .mockResolvedValueOnce([
          {
            ID_ID: "1",
            slaStatus: "ONTRACK",
            slaDueDate: 500000,
            slaDuration: 24,
            priority: "MEDIUM",
            slaBreachedAt: null,
          },
        ])
        .mockResolvedValue(1);
      await setSLAProperties(mockTx);
      expect(mockLog.info).toHaveBeenCalledWith(
        "Incident SLA Status Updated Successfully",
        { incidentID: "1", newStatus: "BREACHED" },
      );
      expect(mockLog.info).toHaveBeenCalledWith("Incident SLA breached", {
        incidentID: "1",
      });
    });

    it("does not update if already breached", async () => {
      mockTx.run.mockResolvedValue([
        {
          ID_ID: "1",
          slaStatus: "BREACHED",
          slaDueDate: 500000,
          slaDuration: 24,
          priority: "CRITICAL",
          slaBreachedAt: 900000,
        },
      ]);
      await setSLAProperties(mockTx);
      expect(mockTx.run).toHaveBeenCalledTimes(1);
    });

    it("escalates priority when ATRISK", async () => {
      mockTx.run
        .mockResolvedValueOnce([
          {
            ID_ID: "2",
            slaStatus: "ONTRACK",
            slaDueDate: 1000000 + 5 * 3600000,
            slaDuration: 24,
            priority: "LOW",
            slaBreachedAt: null,
          },
        ])
        .mockResolvedValue(1);
      await setSLAProperties(mockTx);
      expect(mockLog.info).toHaveBeenCalledWith(
        "Priority escalated due to SLA risk",
        { incidentID: "2", newPriority: "MEDIUM" },
      );
    });

    it("does not escalate CRITICAL", async () => {
      mockTx.run
        .mockResolvedValueOnce([
          {
            ID_ID: "3",
            slaStatus: "ONTRACK",
            slaDueDate: 1000000 + 5 * 3600000,
            slaDuration: 24,
            priority: "CRITICAL",
            slaBreachedAt: null,
          },
        ])
        .mockResolvedValue(1);
      await setSLAProperties(mockTx);
      expect(mockTx.run).toHaveBeenCalledTimes(2);
    });

    it("handles empty list", async () => {
      mockTx.run.mockResolvedValue([]);
      await setSLAProperties(mockTx);
      expect(mockLog.info).toHaveBeenCalledWith("SLA properties updated", {
        processedCount: 0,
      });
    });
  });

  describe("UpdateSlaStatus", () => {
    beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(1000000));
    afterEach(() => jest.restoreAllMocks());

    it("returns ONTRACK", async () => {
      // make due date far in the future so it's ONTRACK
      const farFuture = 1000000 + 48 * 3600000; // 48 hours ahead
      expect(
        await UpdateSlaStatus({ slaDueDate: farFuture, slaDuration: 24 }),
      ).toBe("ONTRACK");
    });

    it("returns ATRISK", async () => {
      expect(
        await UpdateSlaStatus({
          slaDueDate: 1000000 + 5 * 3600000,
          slaDuration: 24,
        }),
      ).toBe("ATRISK");
    });

    it("returns BREACHED when past due", async () => {
      expect(
        await UpdateSlaStatus({ slaDueDate: 500000, slaDuration: 24 }),
      ).toBe("BREACHED");
    });

    it("returns BREACHED at due date", async () => {
      expect(
        await UpdateSlaStatus({ slaDueDate: 1000000, slaDuration: 24 }),
      ).toBe("BREACHED");
    });
  });
});
