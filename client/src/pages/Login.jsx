import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/dashboard");
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
        <h1>Team login</h1>

        <div className="form">
          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </label>

          {error ? <div className="error-box">{error}</div> : null}

          <button className="btn primary" onClick={handleSubmit} disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>

        <div className="demo-hint">
          <div><strong>Demo accounts</strong></div>
          <div>Admin: admin@example.com / Admin@123</div>
          <div>Member: member@example.com / Member@123</div>
        </div>
      </div>
    </div>
  );
}
