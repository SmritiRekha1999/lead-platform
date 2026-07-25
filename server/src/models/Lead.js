const mongoose = require("mongoose");

// The lead's status pipeline. Order matters for the UI, not enforced as a strict
// state machine here so an admin can correct mistakes freely.
const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
];

// A single timestamped note left on a lead by a user.
const noteSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// A single entry in the lead's activity trail. Every meaningful change appends one.
const activitySchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // e.g. "created", "status_changed", "assigned", "note_added"
    message: { type: String, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null for the public capture form
  },
  { timestamps: true }
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    source: { type: String, trim: true, default: "public_form" },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: "new",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: [noteSchema],
    activity: [activitySchema],
  },
  { timestamps: true }
);

const Lead = mongoose.model("Lead", leadSchema);

module.exports = Lead;
module.exports.LEAD_STATUSES = LEAD_STATUSES;
