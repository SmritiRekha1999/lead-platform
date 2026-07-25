import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Client-side gate. Note: this only controls what the UI shows. The real
// enforcement lives on the server — this just avoids showing pages a user
// cannot use. If a "role" is passed, non-matching users are bounced too.
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="center-note">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
