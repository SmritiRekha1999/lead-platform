const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../src/models/User");

// Make sure a JWT secret exists during tests even without a .env file.
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";

let mongoServer;

// Start an in-memory MongoDB and connect mongoose to it. Called once per suite.
async function connect() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

// Drop everything and disconnect. Called after a suite finishes.
async function closeDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
}

// Wipe all collections between tests so each test starts clean.
async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

// Convenience: create a user with a known password and return the document.
async function makeUser(role, email) {
  return User.createWithPassword({
    name: role === "admin" ? "Admin User" : "Member User",
    email: email,
    password: "Password@123",
    role: role,
  });
}

// Convenience: sign a token for a user the same way the real controller does.
function tokenFor(user) {
  return jwt.sign({ sub: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

module.exports = { connect, closeDatabase, clearDatabase, makeUser, tokenFor };
