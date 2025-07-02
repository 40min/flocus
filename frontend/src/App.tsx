import { useMenuState } from './hooks/useMenuState';
import React from 'react';
import { Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import MyDayPage from './pages/MyDayPage';
import DashboardPage from './pages/DashboardPage'; // New import
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TemplatesPage from './pages/TemplatesPage';
import EditTemplatePage from './pages/EditTemplatePage';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import { cn } from './lib/utils';
import CategoriesPage from './pages/CategoriesPage';
import TasksPage from './pages/TasksPage';
import UserSettingsPage from './pages/UserSettingsPage';
import MessageBalloon from './components/MessageBalloon';
// import { MessageProvider } from './context/MessageContext'; // Removed as it's in index.tsx

// Simple component to protect routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Main layout for authenticated users
const AppLayout: React.FC = () => {
  const { isMenuOpen, toggleMenu } = useMenuState();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    // AuthContext's logout already handles navigation to /login
  };

  return (
    <div className="flex h-screen  text-slate-800">
      <Sidebar isMenuOpen={isMenuOpen} toggleMenu={toggleMenu} handleLogout={handleLogout} />
      <main className={cn("flex-1 p-8 overflow-y-auto transition-all duration-300 ease-in-out")}>
        <Outlet />
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </main>
    </div>
  );
};

function App() {
  const { isLoading: authContextIsLoading } = useAuth();

  if (authContextIsLoading) {
    return <div className="flex items-center justify-center h-screen bg-background-DEFAULT"><p className="text-slate-700">Loading application...</p></div>;
  }

  return (
    <> {/* Removed MessageProvider wrapping */}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes rendered inside AppLayout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} /> {/* Changed from MyDayPage to DashboardPage */}
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="my-day" element={<MyDayPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="templates/new" element={<EditTemplatePage />} />
          <Route path="templates/edit/:templateId" element={<EditTemplatePage />} />
          <Route path="settings" element={<UserSettingsPage />} />
          {/* Fallback for any other authenticated path under "/" */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <MessageBalloon />
    </>
  );
}
export default App;
