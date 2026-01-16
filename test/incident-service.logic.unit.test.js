const { _reportIncidentAction } = require('../lib/incident-logic');

describe("_reportIncidentAction unit tests", () => {

  test("creates a new incident object", async () => {
    const req = {
      data: {
        incidentID: "test-1",
        title: "Server Down",
        description: "Server not responding",
        type: "BUG"
      },
      user: { id: "admin" }
    };

    // mock the DB methods if needed
    const mockEntities = {
      Incidents: {
        create: jest.fn().mockResolvedValue({ ID: "test-1" })
      }
    };

    const result = await _reportIncidentAction(req, mockEntities);

    expect(result.ID).toBe("test-1");
    expect(result.message).toBe("Incident Successfully reported");
    expect(mockEntities.Incidents.create).toHaveBeenCalledWith(req.data);
  });

});