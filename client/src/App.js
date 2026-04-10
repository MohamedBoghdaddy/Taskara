import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import InboxPage from './pages/InboxPage';
import NotesPage from './pages/NotesPage';
import NoteEditorPage from './pages/NoteEditorPage';
import DailyNotePage from './pages/DailyNotePage';
import TodayPage from './pages/TodayPage';
import TasksPage from './pages/TasksPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import PomodoroPage from './pages/PomodoroPage';
import CalendarPage from './pages/CalendarPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SearchPage from './pages/SearchPage';
import TemplatesPage from './pages/TemplatesPage';
import DatabasesPage from './pages/DatabasesPage';
import DatabaseDetailPage from './pages/DatabaseDetailPage';
import GraphPage from './pages/GraphPage';
import CollaborationPage from './pages/CollaborationPage';
import SettingsPage from './pages/SettingsPage';
import AIPage from './pages/AIPage';

const PrivateRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { token } = useAuthStore();
  return !token ? children : <Navigate to="/today" replace />;
};

export default function App() {
  const { preferences } = useAuthStore();
  useEffect(() => {
    const theme = preferences?.theme === 'dark' ? 'dark' :
      preferences?.theme === 'light' ? 'light' :
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }, [preferences?.theme]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />
      <Routes>
        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><AuthLayout><LoginPage /></AuthLayout></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><AuthLayout><RegisterPage /></AuthLayout></PublicRoute>} />
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:id" element={<NoteEditorPage />} />
          <Route path="/daily/:date" element={<DailyNotePage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/pomodoro" element={<PomodoroPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/databases" element={<DatabasesPage />} />
          <Route path="/databases/:id" element={<DatabaseDetailPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/collaboration" element={<CollaborationPage />} />
          <Route path="/ai" element={<AIPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
