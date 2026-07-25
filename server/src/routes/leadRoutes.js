const express = require("express");
const {
  listLeads,
  getLead,
  createLead,
  updateLead,
  assignLead,
  addNote,
} = require("../controllers/leadController");
const { requireAuth, requireRole } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Every route in this file requires a logged-in user.
router.use(requireAuth);

// List (role-scoped inside the controller) and create.
router.get("/", asyncHandler(listLeads));
router.post("/", asyncHandler(createLead));

// Single lead read / update.
router.get("/:id", asyncHandler(getLead));
router.patch("/:id", asyncHandler(updateLead));

// Assignment is admin-only.
router.patch("/:id/assign", requireRole("admin"), asyncHandler(assignLead));

// Notes.
router.post("/:id/notes", asyncHandler(addNote));

module.exports = router;
