import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"];

// Formats an ISO timestamp into something readable.
function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function LeadDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [members, setMembers] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLead = useCallback(async () => {
    setError("");
    try {
      const data = await api.getLead(id);
      setLead(data.lead);
    } catch (err) {
      setError(err.message);
      // If the member is not allowed to see this lead, send them back.
      if (err.status === 403 || err.status === 404) {
        setTimeout(() => navigate("/dashboard"), 1200);
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  // Admins need the member list for the assign dropdown.
  useEffect(() => {
    if (user.role === "admin") {
      api.listMembers().then((data) => setMembers(data.users)).catch(() => {});
    }
  }, [user.role]);

  async function handleStatusChange(newStatus) {
    setError("");
    try {
      const data = await api.updateLead(id, { status: newStatus });
      setLead(data.lead);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAssign(memberId) {
    if (!memberId) return;
    setError("");
    try {
      await api.assignLead(id, memberId);
      await loadLead();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setError("");
    try {
      const data = await api.addNote(id, noteText.trim());
      setLead(data.lead);
      setNoteText("");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div className="center-note">Loading lead...</div>;
  }

  if (!lead) {
    return (
      <div className="center-note">
        {error || "Lead unavailable."}
      </div>
    );
  }

  return (
    <div className="detail">
      <div className="detail-top">
        <Link className="btn ghost" to="/dashboard">← Back</Link>
        <span className={"status-tag status-" + lead.status}>{lead.status}</span>
      </div>

      <h1>{lead.name}</h1>
      <div className="lead-meta">
        <div><span>Email</span> {lead.email}</div>
        <div><span>Phone</span> {lead.phone || "—"}</div>
        <div><span>Company</span> {lead.company || "—"}</div>
        <div><span>Source</span> {lead.source}</div>
        <div><span>Assigned to</span> {lead.assignedTo ? lead.assignedTo.name : "Unassigned"}</div>
        <div><span>Created</span> {formatTime(lead.createdAt)}</div>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      <div className="detail-grid">
        <div className="col">
          <div className="section">
            <h3>Change status</h3>
            <div className="status-buttons">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  className={"btn small " + (s === lead.status ? "primary" : "ghost")}
                  onClick={() => handleStatusChange(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {user.role === "admin" ? (
            <div className="section">
              <h3>Assign</h3>
              <select
                value={lead.assignedTo ? lead.assignedTo._id : ""}
                onChange={(e) => handleAssign(e.target.value)}
              >
                <option value="">Select a team member...</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="section">
            <h3>Notes</h3>
            <div className="add-note">
              <textarea
                placeholder="Add a note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <button className="btn primary" onClick={handleAddNote}>Add note</button>
            </div>
            <div className="note-list">
              {lead.notes.length === 0 ? (
                <div className="muted">No notes yet.</div>
              ) : (
                lead.notes
                  .slice()
                  .reverse()
                  .map((note) => (
                    <div className="note" key={note._id}>
                      <div className="note-body">{note.body}</div>
                      <div className="note-time">
                        {note.author && note.author.name ? note.author.name + " · " : ""}
                        {formatTime(note.createdAt)}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        <div className="col">
          <div className="section">
            <h3>Activity trail</h3>
            <div className="activity-list">
              {lead.activity
                .slice()
                .reverse()
                .map((entry) => (
                  <div className="activity" key={entry._id}>
                    <div className="activity-dot" />
                    <div>
                      <div className="activity-msg">{entry.message}</div>
                      <div className="activity-time">{formatTime(entry.createdAt)}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
