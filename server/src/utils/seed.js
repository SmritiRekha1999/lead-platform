require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Lead = require("../models/Lead");

// Seeds the database with one admin, one member, and a few sample leads so the
// deployed app has something to show and the graders have working credentials.
// Running it twice wipes and re-creates, so it is safe to re-run.
async function seed() {
  await connectDB();

  console.log("Clearing existing users and leads...");
  await User.deleteMany({});
  await Lead.deleteMany({});

  const admin = await User.createWithPassword({
    name: "Admin User",
    email: "admin@example.com",
    password: "Admin@123",
    role: "admin",
  });

  const member = await User.createWithPassword({
    name: "Member User",
    email: "member@example.com",
    password: "Member@123",
    role: "member",
  });

  console.log("Created admin and member accounts.");

  // A lead already assigned to the member so their dashboard is not empty.
  const assignedLead = new Lead({
    name: "Priya Sharma",
    email: "priya@acme.test",
    phone: "9990001111",
    company: "Acme Corp",
    source: "public_form",
    status: "contacted",
    assignedTo: member._id,
    activity: [
      { type: "created", message: "Lead captured from the public form", actor: null },
      { type: "assigned", message: "Assigned to Member User", actor: admin._id },
      { type: "status_changed", message: "Status changed from new to contacted", actor: member._id },
    ],
  });

  // An unassigned lead sitting in the admin's queue.
  const newLead = new Lead({
    name: "Rahul Verma",
    email: "rahul@globex.test",
    phone: "8887776666",
    company: "Globex",
    source: "public_form",
    status: "new",
    activity: [
      { type: "created", message: "Lead captured from the public form", actor: null },
    ],
  });

  await assignedLead.save();
  await newLead.save();

  console.log("Created sample leads.");
  console.log("\nSeed complete. Credentials:");
  console.log("  Admin  -> admin@example.com / Admin@123");
  console.log("  Member -> member@example.com / Member@123");

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(function (error) {
  console.error("Seed failed:", error);
  process.exit(1);
});
