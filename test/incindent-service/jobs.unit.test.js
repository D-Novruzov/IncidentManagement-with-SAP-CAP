const mockInfo = jest.fn();
const mockError = jest.fn();

jest.mock("@sap/cds", () => ({
  spawn: jest.fn(),
  log: jest.fn(() => ({ info: mockInfo, error: mockError })),
}));

const cds = require("@sap/cds");
const jobs = require("../../srv/incident-service/lib/jobs");

describe("_runScheduledJob", () => {
  beforeEach(() => jest.clearAllMocks());

  test("calls cds.spawn with tenant and returns message", async () => {
    const req = { tenant: "T1" };
    cds.spawn.mockResolvedValue();

    const res = await jobs._runScheduledJob(req);

    expect(cds.spawn).toHaveBeenCalledWith(
      { tenant: req.tenant },
      expect.any(Function),
    );
    expect(res).toEqual({ message: "Job started" });
  });

  test("logs error when cds.spawn rejects", async () => {
    const req = { tenant: "T1" };
    const err = new Error("boom");
    cds.spawn.mockRejectedValue(err);

    const res = await jobs._runScheduledJob(req);

    expect(mockError).toHaveBeenCalledWith("Scheduled job failed", err);
    expect(res).toEqual({ message: "Job started" });
  });
});
