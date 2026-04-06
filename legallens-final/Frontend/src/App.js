import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/common/Sidebar.js";
import LoginContainer from "./components/auth/LoginContainer.js";
import LegalLensDashboard from "./pages/dashboard/LegalLensDashboard.js";
import CasesPage from "./pages/cases/CasesPage.js";
import CaseDetails from "./components/cases/CaseDetails.js";
import CreatePage from "./pages/dashboard/CreatePage.js";
import MembersPage from "./pages/dashboard/MembersPage.js";
import AuditLogPage from "./pages/audit/AuditLogPage.js";
import SettingsPage from "./pages/settings/SettingsPage.js";
import ProfilePage from "./pages/profile/ProfilePage.js";
import NotificationsPage from "./pages/notifications/NotificationsPage.js";
import UploadEvidencePage from "./pages/evidence/UploadEvidencePage.js";
import "./App.css";

// Redirect to login if not authenticated
function ProtectedRoute({ children, allowedRoles }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  if (!token || !user) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role_id)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// Wrap pages with the sidebar layout
function DashboardLayout({ children }) {
  return (
    <>
      <Sidebar />
      <div className="mainContentArea dashboard-bg">{children}</div>
    </>
  );
}

function App() {
  return (
    <div className="appContainer">
      <Routes>
        {/* Public */}
        <Route path="/" element={<LoginContainer />} />

        {/* All logged-in users */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <LegalLensDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CasesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/:caseId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CaseDetails />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <NotificationsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProfilePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin only */}
        <Route
          path="/create-case"
          element={
            <ProtectedRoute allowedRoles={[1]}>
              <DashboardLayout>
                <CreatePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-members"
          element={
            <ProtectedRoute allowedRoles={[1]}>
              <DashboardLayout>
                <MembersPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin + Lead Investigator */}
        <Route
          path="/audit-log"
          element={
            <ProtectedRoute allowedRoles={[1, 2]}>
              <DashboardLayout>
                <AuditLogPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Police Officer + Forensic Officer — Upload Evidence */}
        <Route
          path="/upload-evidence"
          element={
            <ProtectedRoute allowedRoles={[3, 4]}>
              <DashboardLayout>
                <UploadEvidencePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default App;
