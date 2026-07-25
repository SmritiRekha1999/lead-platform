const request = require("supertest");
const app = require("../src/app");
const Lead = require("../src/models/Lead");
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

describe("Authentication rules", () => {
  test("rejects access to a protected route with no token (401)", async () => {
    const res = await request(app).get("/api/leads");
    expect(res.status).toBe(401);
  });

  test("rejects a protected route with a garbage token (401)", async () => {
    const res = await request(app)
      .get("/api/leads")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  test("login with correct credentials returns a token (200)", async () => {
    await makeUser("admin", "admin@test.com");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "Password@123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("admin");
    // The password hash must never be returned.
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test("login with a wrong password is rejected (401)", async () => {
    await makeUser("member", "member@test.com");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "member@test.com", password: "WrongPassword" });
    expect(res.status).toBe(401);
  });
});

describe("Role permission rules", () => {
  test("a member cannot reach the admin-only assign route (403)", async () => {
    const admin = await makeUser("admin", "admin@test.com");
    const member = await makeUser("member", "member@test.com");

    const lead = await Lead.create({ name: "X", email: "x@test.com", status: "new" });

    const res = await request(app)
      .patch("/api/leads/" + lead._id + "/assign")
      .set("Authorization", "Bearer " + tokenFor(member))
      .send({ assignedTo: member._id });

    expect(res.status).toBe(403);
  });

  test("a member cannot create another member (admin-only) (403)", async () => {
    const member = await makeUser("member", "member@test.com");
    const res = await request(app)
      .post("/api/auth/members")
      .set("Authorization", "Bearer " + tokenFor(member))
      .send({ name: "New", email: "new@test.com", password: "Password@123" });
    expect(res.status).toBe(403);
  });

  test("a member cannot view a lead that is not theirs (403)", async () => {
    const memberA = await makeUser("member", "a@test.com");
    const memberB = await makeUser("member", "b@test.com");

    // Lead belongs to member B.
    const lead = await Lead.create({
      name: "Not yours",
      email: "ny@test.com",
      status: "new",
      assignedTo: memberB._id,
    });

    // Member A tries to read it.
    const res = await request(app)
      .get("/api/leads/" + lead._id)
      .set("Authorization", "Bearer " + tokenFor(memberA));

    expect(res.status).toBe(403);
  });
});
