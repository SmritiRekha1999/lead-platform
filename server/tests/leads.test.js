const request = require("supertest");
const app = require("../src/app");
const {
  connect,
  closeDatabase,
  clearDatabase,
  makeUser,
  tokenFor,
} = require("./setup");

beforeAll(connect);
afterAll(closeDatabase);
afterEach(clearDatabase);

describe("Core flow 1: capture -> assign -> work the lead", () => {
  test("public capture creates a lead, admin assigns it, member notes and advances it", async () => {
    const admin = await makeUser("admin", "admin@test.com");
    const member = await makeUser("member", "member@test.com");

    // 1. Public capture (no auth) creates the lead.
    const capture = await request(app)
      .post("/api/public/leads")
      .send({ name: "Anita Roy", email: "anita@lead.test", company: "Initech" });
    expect(capture.status).toBe(201);
    const leadId = capture.body.lead._id;
    expect(capture.body.lead.status).toBe("new");

    // 2. Admin can see it in the list.
    const adminList = await request(app)
      .get("/api/leads")
      .set("Authorization", "Bearer " + tokenFor(admin));
    expect(adminList.status).toBe(200);
    expect(adminList.body.data.length).toBe(1);

    // 3. Before assignment the member sees nothing.
    const emptyList = await request(app)
      .get("/api/leads")
      .set("Authorization", "Bearer " + tokenFor(member));
    expect(emptyList.body.data.length).toBe(0);

    // 4. Admin assigns the lead to the member.
    const assign = await request(app)
      .patch("/api/leads/" + leadId + "/assign")
      .set("Authorization", "Bearer " + tokenFor(admin))
      .send({ assignedTo: member._id });
    expect(assign.status).toBe(200);

    // 5. Now the member sees exactly one lead.
    const memberList = await request(app)
      .get("/api/leads")
      .set("Authorization", "Bearer " + tokenFor(member));
    expect(memberList.body.data.length).toBe(1);

    // 6. Member adds a timestamped note.
    const note = await request(app)
      .post("/api/leads/" + leadId + "/notes")
      .set("Authorization", "Bearer " + tokenFor(member))
      .send({ body: "Called the lead, will follow up tomorrow." });
    expect(note.status).toBe(201);
    expect(note.body.lead.notes.length).toBe(1);
    expect(note.body.lead.notes[0].createdAt).toBeDefined();

    // 7. Member advances the status.
    const advance = await request(app)
      .patch("/api/leads/" + leadId)
      .set("Authorization", "Bearer " + tokenFor(member))
      .send({ status: "contacted" });
    expect(advance.status).toBe(200);
    expect(advance.body.lead.status).toBe("contacted");

    // 8. The activity trail recorded created + assigned + note_added + status_changed.
    const types = advance.body.lead.activity.map((a) => a.type);
    expect(types).toContain("created");
    expect(types).toContain("assigned");
    expect(types).toContain("note_added");
    expect(types).toContain("status_changed");
  });
});

describe("Core flow 2: pagination and filtering with role scoping", () => {
  test("admin list paginates and filters by status", async () => {
    const admin = await makeUser("admin", "admin@test.com");

    // Create 25 leads via the public form: 10 will be 'new', then we flip some.
    for (let i = 0; i < 25; i++) {
      await request(app)
        .post("/api/public/leads")
        .send({ name: "Lead " + i, email: "lead" + i + "@test.com" });
    }

    // Page 1 with limit 10 returns 10 and the correct pagination meta.
    const page1 = await request(app)
      .get("/api/leads?page=1&limit=10")
      .set("Authorization", "Bearer " + tokenFor(admin));
    expect(page1.status).toBe(200);
    expect(page1.body.data.length).toBe(10);
    expect(page1.body.pagination.total).toBe(25);
    expect(page1.body.pagination.totalPages).toBe(3);

    // Page 3 returns the remaining 5.
    const page3 = await request(app)
      .get("/api/leads?page=3&limit=10")
      .set("Authorization", "Bearer " + tokenFor(admin));
    expect(page3.body.data.length).toBe(5);

    // Filtering by a status nobody has yet returns zero.
    const wonOnly = await request(app)
      .get("/api/leads?status=won")
      .set("Authorization", "Bearer " + tokenFor(admin));
    expect(wonOnly.body.data.length).toBe(0);
  });

  test("an unknown status filter is rejected (400)", async () => {
    const admin = await makeUser("admin", "admin@test.com");
    const res = await request(app)
      .get("/api/leads?status=banana")
      .set("Authorization", "Bearer " + tokenFor(admin));
    expect(res.status).toBe(400);
  });
});
