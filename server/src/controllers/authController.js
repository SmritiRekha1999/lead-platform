const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Signs a JWT that carries the user id in the standard "sub" claim.
// Kept small on purpose: the middleware re-loads the user from the DB on every
// request, so the token only needs to identify who the caller is.
function signToken(user) {
  return jwt.sign({ sub: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

// POST /api/auth/login
// Public. Exchanges email + password for a JWT.
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Same message for "no such user" and "wrong password" so we don't reveal
    // which emails exist.
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const passwordOk = await user.checkPassword(password);
  if (!passwordOk) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = signToken(user);
  return res.status(200).json({ token: token, user: user });
}

// GET /api/auth/me
// Authenticated. Returns the current user so the frontend can restore its
// session and decide which UI to show.
async function me(req, res) {
  return res.status(200).json({ user: req.user });
}

// POST /api/auth/members
// Admin only. Lets an admin create a new member (or admin) account.
async function createMember(req, res) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required." });
  }

  const requestedRole = role === "admin" ? "admin" : "member";

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: "A user with that email already exists." });
  }

  const user = await User.createWithPassword({
    name: name,
    email: email,
    password: password,
    role: requestedRole,
  });

  return res.status(201).json({ user: user });
}

// GET /api/auth/members
// Admin only. Returns all users so an admin can pick an assignee. Password
// hashes are stripped by the model's toJSON.
async function listUsers(req, res) {
  const users = await User.find().sort({ createdAt: 1 });
  return res.status(200).json({ users: users });
}

module.exports = { login, me, createMember, listUsers };
