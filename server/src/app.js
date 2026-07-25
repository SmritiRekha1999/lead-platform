const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const publicRoutes = require("./routes/publicRoutes");
const leadRoutes = require("./routes/leadRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Health check — handy for uptime pings on the free tier.
app.get("/api/health", function (req, res) {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/leads", leadRoutes);

// 404 for anything unmatched under /api.
app.use(function (req, res) {
  res.status(404).json({ error: "Route not found." });
});

// Central error handler. Any error thrown in an async handler that isn't caught
// locally lands here as a 500 instead of crashing the process.
app.use(function (err, req, res, next) {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

module.exports = app;
