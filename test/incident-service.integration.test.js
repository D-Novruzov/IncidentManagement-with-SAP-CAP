const cds = require("@sap/cds");

describe("closeIncident integration", () => {
  let srv;

  beforeAll(async () => {
    srv = await cds.test(__dirname + "/../..");
  });

  afterEach(async () => {
    await srv.run(DELETE.from("Incidents"));
  });

  test("should close incident successfully", async () => {
    await srv.run(
      INSERT.into("Incidents").entries({
        ID: "inc-123",
        status: "OPEN",
        type: "BUG",
        createdAt: new Date().toISOString(),
      })
    );

    await srv.run(
      srv.actions.closeIncident({ incidentId: "inc-123" })
    );

    const updated = await srv.run(
      SELECT.one.from("Incidents").where({ ID: "inc-123" })
    );

    expect(updated.status).toBe("CLOSED");
  });

  test("should fail if incidentId is missing", async () => {
    await expect(
      srv.run(srv.actions.closeIncident({}))
    ).rejects.toThrow("incidentId is required");
  });
});
