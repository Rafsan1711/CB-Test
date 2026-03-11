import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth-context';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { RepoDetailPage } from './pages/RepoDetailPage';
import { TasksPage } from './pages/TasksPage';
import { DocsPage } from './pages/DocsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LandingPage } from './pages/LandingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CommandPalette } from './components/CommandPalette';
import { TaskProgressCard } from './components/TaskProgressCard';
import { Toaster } from 'react-hot-toast';

// Placeholder components for other routes
const ReleasesPage = () => <div className="text-gray-400">Releases Page</div>;

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { supabaseUser, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-green-400">Loading...</div>;
  }
  
  if (!supabaseUser) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-green-400">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/repos" element={<RepositoriesPage />} />
        <Route path="/repos/:id/*" element={<RepoDetailPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/releases" element={<ReleasesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
};

const GlobalComponents = () => {
  const { supabaseUser } = useAuth();
  if (!supabaseUser) return null;
  return (
    <>
      <CommandPalette />
      <TaskProgressCard />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <GlobalComponents />
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#f3f4f6',
              border: '1px solid #374151',
            },
            success: {
              iconTheme: {
                primary: '#4ade80',
                secondary: '#1f2937',
              },
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
