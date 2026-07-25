const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const { LEAD_STATUSES } = require("../models/Lead");
const User = require("../models/User");

// Extracts the id string from an assignedTo value that may be either a raw
// ObjectId (unpopulated) or a full user document (populated). Returns null when
// the lead is unassigned.
function assignedIdOf(lead) {
  if (!lead.assignedTo) {
    return null;
  }
  // Populated document has an _id; a raw ObjectId does not.
  if (lead.assignedTo._id) {
    return lead.assignedTo._id.toString();
  }
  return lead.assignedTo.toString();
}

// canAccessLead: the single source of truth for "is this user allowed to touch
// this lead". Admins can access every lead. Members can only access leads that
// are assigned to them. Used by every member-facing read and write below.
function canAccessLead(user, lead) {
  if (user.role === "admin") {
    return true;
  }
  const assignedId = assignedIdOf(lead);
  if (!assignedId) {
    return false;
  }
  return assignedId === user._id.toString();
}

// POST /api/public/leads
// PUBLIC — no auth. This is the capture form anyone on the internet can submit.
async function createPublicLead(req, res) {
  const { name, email, phone, company } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required." });
  }

  const lead = new Lead({
    name: name,
    email: email,
    phone: phone,
    company: company,
    source: "public_form",
    status: "new",
    activity: [
      {
        type: "created",
        message: "Lead captured from the public form",
        actor: null,
      },
    ],
  });

  await lead.save();
  return res.status(201).json({ lead: lead });
}

// GET /api/leads
// Authenticated. Supports pagination (?page&limit), filtering (?status&assignedTo)
// and text search (?q). Members only ever see their own assigned leads; admins
// see everything. Scoping happens in the query itself, not after fetching.
async function listLeads(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const filter = {};

  // Role scoping: a member's list is hard-limited to their own leads at the DB level.
  if (req.user.role === "member") {
    filter.assignedTo = req.user._id;
  } else if (req.query.assignedTo) {
    // Admins may optionally filter by a specific assignee.
    if (mongoose.isValidObjectId(req.query.assignedTo)) {
      filter.assignedTo = req.query.assignedTo;
    } else {
      return res.status(400).json({ error: "assignedTo must be a valid id." });
    }
  }

  // Optional status filter, validated against the allowed pipeline.
  if (req.query.status) {
    if (!LEAD_STATUSES.includes(req.query.status)) {
      return res.status(400).json({ error: "Unknown status value." });
    }
    filter.status = req.query.status;
  }

  // Optional free-text search across name, email and company.
  if (req.query.q) {
    const term = req.query.q.trim();
    filter.$or = [
      { name: { $regex: term, $options: "i" } },
      { email: { $regex: term, $options: "i" } },
      { company: { $regex: term, $options: "i" } },
    ];
  }

  const total = await Lead.countDocuments(filter);
  const leads = await Lead.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("assignedTo", "name email role");

  return res.status(200).json({
    data: leads,
    pagination: {
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// GET /api/leads/:id
// Authenticated. Members are blocked (403) from leads that are not theirs.
async function getLead(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid lead id." });
  }

  const lead = await Lead.findById(req.params.id)
    .populate("assignedTo", "name email role")
    .populate("notes.author", "name email")
    .populate("activity.actor", "name email");

  if (!lead) {
    return res.status(404).json({ error: "Lead not found." });
  }

  if (!canAccessLead(req.user, lead)) {
    return res.status(403).json({ error: "You do not have permission to view this lead." });
  }

  return res.status(200).json({ lead: lead });
}

// POST /api/leads
// Authenticated. Lets a logged-in user create a lead manually (e.g. from a phone
// call). Admins may assign it on creation; members cannot.
async function createLead(req, res) {
  const { name, email, phone, company, assignedTo } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required." });
  }

  const lead = new Lead({
    name: name,
    email: email,
    phone: phone,
    company: company,
    source: "manual",
    status: "new",
    activity: [
      {
        type: "created",
        message: "Lead created by " + req.user.name,
        actor: req.user._id,
      },
    ],
  });

  // Only an admin may set an assignee at creation time.
  if (assignedTo && req.user.role === "admin") {
    if (!mongoose.isValidObjectId(assignedTo)) {
      return res.status(400).json({ error: "assignedTo must be a valid id." });
    }
    lead.assignedTo = assignedTo;
    lead.activity.push({
      type: "assigned",
      message: "Assigned on creation",
      actor: req.user._id,
    });
  }

  await lead.save();
  return res.status(201).json({ lead: lead });
}

// PATCH /api/leads/:id
// Authenticated. Updates status and/or editable fields. Members may only edit
// their own leads. Every status change is written to the activity trail.
async function updateLead(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid lead id." });
  }

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: "Lead not found." });
  }

  if (!canAccessLead(req.user, lead)) {
    return res.status(403).json({ error: "You do not have permission to edit this lead." });
  }

  const { status, name, email, phone, company } = req.body;

  if (status !== undefined) {
    if (!LEAD_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Unknown status value." });
    }
    if (status !== lead.status) {
      const previous = lead.status;
      lead.status = status;
      lead.activity.push({
        type: "status_changed",
        message: "Status changed from " + previous + " to " + status,
        actor: req.user._id,
      });
    }
  }

  if (name !== undefined) lead.name = name;
  if (email !== undefined) lead.email = email;
  if (phone !== undefined) lead.phone = phone;
  if (company !== undefined) lead.company = company;

  await lead.save();
  return res.status(200).json({ lead: lead });
}

// PATCH /api/leads/:id/assign
// Admin only (enforced again at the route with requireRole). Assigns a lead to a
// member and records it in the activity trail.
async function assignLead(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid lead id." });
  }

  const { assignedTo } = req.body;
  if (!assignedTo || !mongoose.isValidObjectId(assignedTo)) {
    return res.status(400).json({ error: "A valid assignedTo id is required." });
  }

  const assignee = await User.findById(assignedTo);
  if (!assignee) {
    return res.status(404).json({ error: "The user to assign to does not exist." });
  }

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: "Lead not found." });
  }

  lead.assignedTo = assignee._id;
  lead.activity.push({
    type: "assigned",
    message: "Assigned to " + assignee.name,
    actor: req.user._id,
  });

  await lead.save();
  return res.status(200).json({ lead: lead });
}

// POST /api/leads/:id/notes
// Authenticated. Adds a timestamped note. Members may only note their own leads.
async function addNote(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid lead id." });
  }

  const { body } = req.body;
  if (!body || !body.trim()) {
    return res.status(400).json({ error: "Note body cannot be empty." });
  }

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: "Lead not found." });
  }

  if (!canAccessLead(req.user, lead)) {
    return res.status(403).json({ error: "You do not have permission to note this lead." });
  }

  lead.notes.push({ body: body.trim(), author: req.user._id });
  lead.activity.push({
    type: "note_added",
    message: req.user.name + " added a note",
    actor: req.user._id,
  });

  await lead.save();
  return res.status(201).json({ lead: lead });
}

module.exports = {
  createPublicLead,
  listLeads,
  getLead,
  createLead,
  updateLead,
  assignLead,
  addNote,
};
