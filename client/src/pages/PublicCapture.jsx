import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

// The public-facing capture form. Anyone can submit it; it creates a "new" lead.
export default function PublicCapture() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function handleChange(field, value) {
    setForm({ ...form, [field]: value });
  }

  async function handleSubmit() {
    setError("");

    if (!form.name || !form.email) {
      setError("Name and email are required.");
      return;
    }

    setBusy(true);
    try {
      await api.submitPublicLead(form);
      setSubmitted(true);
      setForm({ name: "", email: "", phone: "", company: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="public-page">
      <div className="public-card">
        <div className="brand">LeadFlow</div>
        <h1>Get in touch</h1>
        <p className="subtitle">
          Leave your details and our team will reach out shortly.
        </p>

        {submitted ? (
          <div className="success-box">
            <strong>Thank you!</strong>
            <p>Your details were received. We'll be in touch soon.</p>
            <button className="btn ghost" onClick={() => setSubmitted(false)}>
              Submit another
            </button>
          </div>
        ) : (
          <div className="form">
            <label>
              Name *
              <input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Your full name"
              />
            </label>
            <label>
              Email *
              <input
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Phone
              <input
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="Optional"
              />
            </label>
            <label>
              Company
              <input
                value={form.company}
                onChange={(e) => handleChange("company", e.target.value)}
                placeholder="Optional"
              />
            </label>

            {error ? <div className="error-box">{error}</div> : null}

            <button className="btn primary" onClick={handleSubmit} disabled={busy}>
              {busy ? "Submitting..." : "Submit"}
            </button>
          </div>
        )}

        <div className="team-link">
          Sales team? <Link to="/login">Log in here</Link>
        </div>
      </div>
    </div>
  );
}
