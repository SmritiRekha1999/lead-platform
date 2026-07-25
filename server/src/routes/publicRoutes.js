const express = require("express");
const { createPublicLead } = require("../controllers/leadController");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Public: the capture form anyone can submit. No auth on purpose.
router.post("/leads", asyncHandler(createPublicLead));

module.exports = router;
