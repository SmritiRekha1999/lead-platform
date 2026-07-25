import { Routes, Route, Navigate } from "react-router-dom";
import PublicCapture from "./pages/PublicCapture";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LeadDetail from "./pages/LeadDetail";
import ProtectedRoute from "./components/ProtectedRoute";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="app-shell">
      <div className="app-content">
        <Routes>
          {/* Public capture form — the landing page, no login required. */}
          <Route path="/" element={<PublicCapture />} />
          <Route path="/login" element={<Login />} />

          {/* Authenticated internal app. */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads/:id"
            element={
              <ProtectedRoute>
                <LeadDetail />
              </ProtectedRoute>
            }
          />

          {/* Anything else goes back to the capture form. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
