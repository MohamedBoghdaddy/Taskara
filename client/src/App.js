import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import InboxPage from "./pages/InboxPage";
import NotesPage from "./pages/NotesPage";
import NoteEditorPage from "./pages/NoteEditorPage";
import DailyNotePage from "./pages/DailyNotePage";
import TodayPage from "./pages/TodayPage";
import TasksPage from "./pages/TasksPage";
import BoardPage from "./pages/BoardPage";
import BacklogPage from "./pages/BacklogPage";
import SprintsPage from "./pages/SprintsPage";
import SprintDetailPage from "./pages/SprintDetailPage";
import TimelinePage from "./pages/TimelinePage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import PomodoroPage from "./pages/PomodoroPage";
import CalendarPage from "./pages/CalendarPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SearchPage from "./pages/SearchPage";
import TemplatesPage from "./pages/TemplatesPage";
import DatabasesPage from "./pages/DatabasesPage";
import DatabaseDetailPage from "./pages/DatabaseDetailPage";
import GraphPage from "./pages/GraphPage";
import CollaborationPage from "./pages/CollaborationPage";
import SettingsPage from "./pages/SettingsPage";
import AIPage from "./pages/AIPage";
import AutomationsPage from "./pages/AutomationsPage";
import WebhooksPage from "./pages/WebhooksPage";
import PricingPage from "./pages/PricingPage";
import CanvasPage from "./pages/CanvasPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import AudienceSolutionPage from "./pages/AudienceSolutionPage";
import AgencyDashboardPage from "./pages/AgencyDashboardPage";
import AgencyClientsPage from "./pages/AgencyClientsPage";
import AgencyCampaignsPage from "./pages/AgencyCampaignsPage";
import AgencyContentCalendarPage from "./pages/AgencyContentCalendarPage";
import AgencyReportsPage from "./pages/AgencyReportsPage";
import AgencyApprovalsPage from "./pages/AgencyApprovalsPage";
import RealEstateDashboardPage from "./pages/RealEstateDashboardPage";
import RealEstateLeadsPage from "./pages/RealEstateLeadsPage";
import RealEstatePropertiesPage from "./pages/RealEstatePropertiesPage";
import RealEstateDealsPage from "./pages/RealEstateDealsPage";
import RealEstateSettlementsPage from "./pages/RealEstateSettlementsPage";
import RealEstateViewingsPage from "./pages/RealEstateViewingsPage";

const getDefaultAuthenticatedPath = (user) =>
  user?.workspaceContext?.surfaceMode === "student" ? "/today" : "/dashboard";

const PrivateRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { token, user } = useAuthStore();
  return !token ? children : <Navigate to={getDefaultAuthenticatedPath(user)} replace />;
};

export default function App() {
  const { preferences, user } = useAuthStore();

  useEffect(() => {
    const theme =
      preferences?.theme === "dark"
        ? "dark"
        : preferences?.theme === "light"
          ? "light"
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    document.documentElement.setAttribute("data-theme", theme);
  }, [preferences?.theme]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          },
          duration: 3500,
        }}
      />
      <Routes>
        {/* Public */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <AuthLayout>
                <RegisterPage />
              </AuthLayout>
            </PublicRoute>
          }
        />

        {/* Protected — inside AppLayout */}
        <Route path="/for-recruiters" element={<AudienceSolutionPage audienceKey="recruiters" />} />
        <Route path="/for-startups" element={<AudienceSolutionPage audienceKey="startups" />} />
        <Route path="/for-agencies" element={<AudienceSolutionPage audienceKey="agencies" />} />
        <Route path="/for-real-estate" element={<AudienceSolutionPage audienceKey="realestate" />} />

        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/inbox" element={<InboxPage />} />

          {/* Notes */}
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/new" element={<NoteEditorPage />} />
          <Route path="/notes/:id" element={<NoteEditorPage />} />
          <Route path="/daily/today" element={<DailyNotePage />} />
          <Route path="/daily/:date" element={<DailyNotePage />} />

          {/* Tasks + Work */}
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/boards" element={<BoardPage />} />
          <Route path="/backlog" element={<BacklogPage />} />
          <Route path="/sprints" element={<SprintsPage />} />
          <Route path="/sprints/:id" element={<SprintDetailPage />} />
          <Route path="/timeline" element={<TimelinePage />} />

          {/* Projects */}
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />

          {/* Focus */}
          <Route path="/pomodoro" element={<PomodoroPage />} />

          {/* Insights */}
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/search" element={<SearchPage />} />

          {/* Knowledge */}
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/databases" element={<DatabasesPage />} />
          <Route path="/databases/:id" element={<DatabaseDetailPage />} />
          <Route path="/graph" element={<GraphPage />} />

          {/* Canvas */}
          <Route path="/canvas" element={<CanvasPage />} />

          {/* AI + Team */}
          <Route path="/ai" element={<AIPage />} />
          <Route path="/collaboration" element={<CollaborationPage />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />

          {/* Vertical surfaces */}
          <Route path="/agency/dashboard" element={<AgencyDashboardPage />} />
          <Route path="/agency/clients" element={<AgencyClientsPage />} />
          <Route path="/agency/campaigns" element={<AgencyCampaignsPage />} />
          <Route path="/agency/content" element={<AgencyContentCalendarPage />} />
          <Route path="/agency/reports" element={<AgencyReportsPage />} />
          <Route path="/agency/approvals" element={<AgencyApprovalsPage />} />

          <Route path="/real-estate/dashboard" element={<RealEstateDashboardPage />} />
          <Route path="/real-estate/leads" element={<RealEstateLeadsPage />} />
          <Route path="/real-estate/properties" element={<RealEstatePropertiesPage />} />
          <Route path="/real-estate/deals" element={<RealEstateDealsPage />} />
          <Route path="/real-estate/viewings" element={<RealEstateViewingsPage />} />
          <Route path="/real-estate/settlements" element={<RealEstateSettlementsPage />} />

          {/* Settings + Pricing */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/pricing" element={<PricingPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={getDefaultAuthenticatedPath(user)} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
