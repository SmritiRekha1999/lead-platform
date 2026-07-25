const express = require("express");
const { login, me, createMember, listUsers } = require("../controllers/authController");
const { requireAuth, requireRole } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Public: exchange credentials for a token.
router.post("/login", asyncHandler(login));

// Authenticated: who am I?
router.get("/me", requireAuth, asyncHandler(me));

// Admin only: list all users (for the assign dropdown) and create new ones.
router.get("/members", requireAuth, requireRole("admin"), asyncHandler(listUsers));
router.post("/members", requireAuth, requireRole("admin"), asyncHandler(createMember));

module.exports = router;
