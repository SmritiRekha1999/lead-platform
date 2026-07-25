const jwt = require("jsonwebtoken");
const User = require("../models/User");

// requireAuth: verifies the JWT from the Authorization header and attaches the
// full user document to req.user. Returns 401 if the token is missing or invalid.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const token = header.slice(7); // strip the leading "Bearer "

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    return res.status(401).json({ error: "User no longer exists." });
  }

  req.user = user;
  next();
}

// requireRole: factory that returns a middleware allowing only the given roles.
// Must run AFTER requireAuth. Returns 403 when the role does not match.
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to do that." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
