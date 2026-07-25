// Central place for all backend calls. Reads the API base URL from the Vite
// environment so the same build works locally and in production.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Low-level request helper. Attaches the JWT from localStorage (if present),
// sends/parses JSON, and throws an Error carrying the server's message and
// status code so callers can show something useful.
async function request(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const response = await fetch(BASE_URL + path, {
    method: options.method || "GET",
    headers: headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  const text = await response.text();
  if (text) {
    data = JSON.parse(text);
  }

  if (!response.ok) {
    const message = data && data.error ? data.error : "Request failed";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

// Named helpers, one per endpoint, so components read cleanly.
export const api = {
  login(email, password) {
    return request("/api/auth/login", { method: "POST", body: { email, password } });
  },
  me() {
    return request("/api/auth/me");
  },
  createMember(payload) {
    return request("/api/auth/members", { method: "POST", body: payload });
  },
  listMembers() {
    return request("/api/auth/members");
  },
  submitPublicLead(payload) {
    return request("/api/public/leads", { method: "POST", body: payload });
  },
  listLeads(query = "") {
    return request("/api/leads" + query);
  },
  getLead(id) {
    return request("/api/leads/" + id);
  },
  updateLead(id, payload) {
    return request("/api/leads/" + id, { method: "PATCH", body: payload });
  },
  assignLead(id, assignedTo) {
    return request("/api/leads/" + id + "/assign", { method: "PATCH", body: { assignedTo } });
  },
  addNote(id, body) {
    return request("/api/leads/" + id + "/notes", { method: "POST", body: { body } });
  },
};
