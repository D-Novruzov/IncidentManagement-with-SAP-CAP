// const cds = require("@sap/cds");

// const { POST } = cds.test(__dirname + "/..");

// describe("ReportIncidentAction", () => {

//   test("should create a new incident successfully", async () => {
//     // 1. ARRANGE - Prepare test data
//     const testId = `incident-${Date.now()}`;
    
//     // 2. ACT - Call the action
//     const response = await POST(
//       "/incidents/ReportIncidentAction",
//       {
//         incidentID: testId,
//         title: "Server Down",
//         description: "Production server is not responding",
//         type: "BUG"
//       },
//       {
//         auth: { username: "admin", password: "admin" }
//       }
//     );

//     // 3. ASSERT - Verify results
//     expect(response.status).toBe(200);
//     expect(response.data.ID).toBe(testId);
//     expect(response.data.message).toBe("Incident Successfully reported");
//   });

//   test("should fail if incidentID is missing", async () => {
//     await expect(
//       POST(
//         "/incidents/ReportIncidentAction",
//         {
//           incidentID: null,
//           title: "Server Down",
//           description: "Production server is not responding",
//           type: "BUG"
//         },
//         { auth: { username: "admin", password: "admin" } }
//       )
//     ).rejects.toMatchObject({
//       "code": "ERR_BAD_REQUEST",
//       "message": "400 - incidentID is required"
//     });
//   });
//   test("should fail if title is missing", async () => {
//     const testId = "ew-12113213-13-123-12-31-23"
//     await expect(
//       POST(
//         "/incidents/ReportIncidentAction",
//         {
//           incidentID: testId,
//           title: null,
//           description: "Production server is not responding",
//           type: "BUG"
//         },
//         { auth: { username: "admin", password: "admin" } }
//       )
//     ).rejects.toMatchObject({
//       "code": "ERR_BAD_REQUEST",
//       "message": "400 - title is required"
//     });
//   });
//   test("should fail if title is missing", async () => {
//     const testId = "ew-12113213-13-123-12-31-23"
//     await expect(
//       POST(
//         "/incidents/ReportIncidentAction",
//         {
//           incidentID: testId,
//           title: 'Server Down',
//           description: null,
//           type: "BUG"
//         },
//         { auth: { username: "admin", password: "admin" } }
//       )
//     ).rejects.toMatchObject({
//       "code": "ERR_BAD_REQUEST",
//       "message": "400 - description is required"
//     });
//   });
//   test("should fail if title is missing", async () => {
//     const testId = "ew-12113213-13-123-12-31-23"
//     await expect(
//       POST(
//         "/incidents/ReportIncidentAction",
//         {
//           incidentID: testId,
//           title: 'Server Down',
//           description: "Production server is not responding",
//           type: null
//         },
//         { auth: { username: "admin", password: "admin" } }
//       )
//     ).rejects.toMatchObject({
//       "code": "ERR_BAD_REQUEST",
//       "message": "400 - type is required"
//     });
//   });
// });
