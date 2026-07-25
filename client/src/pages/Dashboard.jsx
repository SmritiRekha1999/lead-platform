import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"];

export default function Dashboard() {
  const { user, logout } = useAuth();

  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Builds the query string from the current filters and page, then fetches.
  // Wrapped in useCallback so the effect below has a stable dependency.
  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = [];
      params.push("page=" + page);
      params.push("limit=10");
      if (statusFilter) {
        params.push("status=" + statusFilter);
      }
      if (search.trim()) {
        params.push("q=" + encodeURIComponent(search.trim()));
      }
      const query = "?" + params.join("&");
      const data = await api.listLeads(query);
      setLeads(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  function handleStatusChange(value) {
    setPage(1);
    setStatusFilter(value);
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <div className="brand">LeadFlow</div>
          <div className="whoami">
            {user.name} · <span className="role-pill">{user.role}</span>
          </div>
        </div>
        <button className="btn ghost" onClick={logout}>Log out</button>
      </header>

      {user.role === "admin" ? <CreateMember onCreated={loadLeads} /> : null}

      <div className="filters">
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          placeholder="Search name, email, company"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
        />
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      {loading ? (
        <div className="center-note">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="center-note">
          {user.role === "member"
            ? "No leads assigned to you yet."
            : "No leads match these filters."}
        </div>
      ) : (
        <table className="lead-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Status</th>
              <th>Assigned to</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead._id}>
                <td>
                  <div className="lead-name">{lead.name}</div>
                  <div className="lead-email">{lead.email}</div>
                </td>
                <td>{lead.company || "—"}</td>
                <td><span className={"status-tag status-" + lead.status}>{lead.status}</span></td>
                <td>{lead.assignedTo ? lead.assignedTo.name : "Unassigned"}</td>
                <td><Link className="btn small" to={"/leads/" + lead._id}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pager">
        <button
          className="btn ghost"
          disabled={pagination.page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {pagination.page} of {pagination.totalPages} · {pagination.total} leads
        </span>
        <button
          className="btn ghost"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Admin-only widget to create a new team member.
function CreateMember({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleCreate() {
    setError("");
    setMessage("");
    try {
      await api.createMember(form);
      setMessage("Created " + form.email);
      setForm({ name: "", email: "", password: "", role: "member" });
      if (onCreated) onCreated();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="panel">
      <button className="btn ghost" onClick={() => setOpen(!open)}>
        {open ? "Hide" : "＋ Add team member"}
      </button>
      {open ? (
        <div className="member-form">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
          <button className="btn primary" onClick={handleCreate}>Create</button>
          {message ? <div className="success-inline">{message}</div> : null}
          {error ? <div className="error-box">{error}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
