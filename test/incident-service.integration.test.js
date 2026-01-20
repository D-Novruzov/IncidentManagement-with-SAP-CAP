jest.setTimeout(30000);
const cds = require("@sap/cds");
const { expected } = require("@sap/cds/lib/log/cds-error");
const { before } = require("@sap/cds/lib/srv/middlewares");

// Initialize cds.test at module level with correct path (one level up from test/)
const { POST } = cds.test(__dirname + "/..");

describe("Incident Service Integration", () => {
  
  afterEach(async () => {
    // Clean up test data via direct database access
    const db = cds.db;
    if (db) {
      try {
        // Only delete test-created incidents (not seed data)
        await db.run(DELETE.from("my.incidents.IncidentResolveTime").where({ incidentID_ID: { like: 'aaaaaaaa-%' } }));
        await db.run(DELETE.from("my.incidents.Incident").where({ ID_ID: { like: 'aaaaaaaa-%' } }));
        await db.run(DELETE.from("my.incidents.ReportIncident").where({ ID: { like: 'aaaaaaaa-%' } }));
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  describe("closeIncident integration", () => {
    test("should close incident successfully", async () => {
      // Use a UUID that doesn't exist in seed data
      const testId = "aaaaaaaa-1111-1111-1111-111111111111";
      
      // Create incident
      const createResponse = await POST("/incidents/ReportIncidentAction", {
        incidentID: testId,
        title: "Test Login error",
        description: "User cannot log in",
        type: "LOGIN_PROBLEM"
      });
      expect(createResponse.status).toBe(200);
      expect(createResponse.data.message).toBe("Incident Successfully reported");

      // Close the incident
      const closeResponse = await POST("/incidents/closeIncident", { 
        incidentId: testId 
      });
      expect(closeResponse.status).toBe(200);
      expect(closeResponse.data.status).toBe("CLOSED");
    });

    test("should fail if incidentId is missing", async () => {
      try {
        await POST("/incidents/closeIncident", {});
        fail("Should have thrown an error");
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error.message).toContain("incidentId is required");
      }
    });
  });

  describe("reopenIncident integration", () => {
    test("should reopen the closed Incident", async () => {
      // Use a UUID that doesn't exist in seed data
      const testId = "aaaaaaaa-2222-2222-2222-222222222222";
      
      // Create incident
      const createResponse = await POST("/incidents/ReportIncidentAction", {
        incidentID: testId,
        title: "Test Login error",
        description: "User cannot log in",
        type: "LOGIN_PROBLEM"
      });
      expect(createResponse.status).toBe(200);

      // Close it first
      const closeResponse = await POST("/incidents/closeIncident", { 
        incidentId: testId 
      });
      expect(closeResponse.status).toBe(200);

      // Reopen it - needs admin authentication
      const reopenResponse = await POST("/incidents/reopenIncident", { 
        incidentId: testId 
      }, {
        auth: { username: "admin", password: "admin" }
      });
      expect(reopenResponse.status).toBe(200);
      expect(reopenResponse.data.status).toBe("OPEN");
    });
    test('should throw error if the incident is not closed', async () => {
      const testId = "aaaaaaaa-2222-2222-2222-222222222222";
      const createResponse = await POST('/incidents/ReportIncidentAction', {
        incidentID: testId,
        title: "Test Login error",
        description: "User cannot log in",
        type: "LOGIN_PROBLEM"
      })
      expect(createResponse.status).toBe(200)
      
      try {
        await POST("/incidents/reopenIncident", { 
          incidentId: testId 
        }, {
          auth: { username: "admin", password: "admin" }
        });
        fail("Should have thrown an error");
      } catch (error) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.error.message).toContain("To reopen the incident it should be closed");
      }
    })
    test("should throw error if the incident id is not valid", async( ) => {
      const testId =  "aaaaaaaa-2222-2222-2222-222222222222"

      const createResponse  = await POST('/incidents/ReportIncidentAction', {
        incidentID: testId,
        title: "Test Login error",
        description: "User cannot log in",
        type: "LOGIN_PROBLEM"
      })
      expect(createResponse.status).toBe(200)

      try {
        await POST("/incidents/reopenIncident", {
          incidentId: '12312412412-123123-123123'
        }, {
          auth: { username: "admin", password: "admin" }
        })
        fail("should have thrown an error")
      }catch(err) {
        expect(err.response.status).toBe(404)
        expect(err.response.data.error.message).toContain("There is no incident with this id")
      }
    })
  });
  describe("checkAssignIncident", () => {
    test("should check whether incident is already assigned to user",  async () => {

      const testId  = "aaaaaaaa-2222-2222-2222-222222222222";
      const userId = "john.doe"
      const createResponse = await POST('/incidents/ReportIncidentAction', {
        incidentID: testId,
       
        title: "Test Login error",
        description: "User cannot log in",
        type: "LOGIN_PROBLEM"
      })
      expect(createResponse.status).toBe(200)
      
      const checkAssignRes = await POST('/incidents/assignIncident', {
        incidentID : testId,
        userId: userId
      }, {
        auth: { username: "admin", password: "admin" }
      })
      expect(checkAssignRes.status).toBe(204)

    })
    test("should throw error if the incident is already assigned",  async () => {

      const testId  = "aaaaaaaa-3333-3333-3333-333333333333";
      const userId = "john.doe"
      const createResponse = await POST('/incidents/ReportIncidentAction', {
        incidentID: testId,
        title: "Test Login error",
        description: "User cannot log in",
        type: "LOGIN_PROBLEM"
      })
      expect(createResponse.status).toBe(200)
      
      const checkAssignRes = await POST('/incidents/assignIncident', {
        incidentID : testId,
        userId: userId
      }, {
        auth: { username: "admin", password: "admin" }
      })
      expect(checkAssignRes.status).toBe(204)

      try {
        await POST('/incidents/assignIncident', {
          incidentID : testId,
          userId: userId
        }, {
          auth: { username: "admin", password: "admin" }
        })
        fail('should throw error if the incident is already assigned to user')
      }catch(err) {
        expect(err.response.status).toBe(403)
        expect(err.response.data.error.message).toContain("Incident is already assigned to user")
      }
    })
  })
  describe("assignIncidet", () =>  {
    test('should successfully assing user to the incindet', async () => {
      const testId  =  "aaaaaaaa-3333-3333-3333-333333333353"
      const userId = "jane.smith"
      const createResponse = await POST('/incidents/ReportIncidentAction', {
        incidentID: testId,
        title: "Test Login error",
        description: "User cannot log in",
        type: "LOGIN_PROBLEM"
      })
      expect(createResponse.status).toBe(200) 
      const checkAssignRes = await POST('/incidents/assignIncident', {
        incidentID : testId,
        userId: userId
      }, {
        auth: { username: "admin", password: "admin" }
      })
      expect(checkAssignRes.status).toBe(204)
    }) 
    test("should throw error if the incidentId is invalid", async ( ) => {
      const testId  =  "aaaaaaaa-3333-3333-3333-333333333353"
      const userId = "jane.smith"
      const createResponse = await POST('/incidents/ReportIncidentAction', {
        incidentID: testId,
        title: "Test Login error",
        description: "User cannot log in",
        type: "LOGIN_PROBLEM"
      })
      expect(createResponse.status).toBe(200) 
      try {
        const checkAssignRes = await POST('/incidents/assignIncident', {
          incidentID : "aaaaaaaa-3333-3333-3333-333333333253",
          userId: userId
        }, {
          auth: { username: "admin", password: "admin" }
        })
        expect(checkAssignRes.status).toBe(204)
        fail('should throw error since the incident Id is not valid')

      }catch(err) {
        expect(err.response.status).toBe(404)
        expect(err.response.data.error.message).toContain("Invalid incident id")
      }
    })
  })
  
});
   