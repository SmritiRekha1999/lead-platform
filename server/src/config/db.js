const mongoose = require("mongoose");

// Connects to MongoDB using the URI from the environment.
// In the test environment we skip this because tests spin up their own
// in-memory MongoDB server and connect there instead.
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and fill it in.");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");
}

module.exports = connectDB;
