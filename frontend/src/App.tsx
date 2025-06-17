import React from 'react';
import { Route, Routes, Navigate, NavLink, Outlet } from 'react-router-dom';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import flocusLogo from './assets/flocus_logo.png';
import { Home, ListTodo, FileText, CalendarDays, Folder, Settings, LogOut, Timer } from 'lucide-react';
import MyDayPage from './pages/MyDayPage';
import DashboardPage from './pages/DashboardPage'; // New import
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TemplatesPage from './pages/TemplatesPage';
import EditTemplatePage from './pages/EditTemplatePage';
import { useAuth } from './context/AuthContext';
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
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    // AuthContext's logout already handles navigation to /login
  };

  return (
    <div className="flex h-screen  text-slate-800">
      <aside className="flex flex-col w-64 bg-background-card border-r border-slate-200 p-4 space-y-4 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-2 py-2">
          <img src={flocusLogo} alt="Flocus Logo" className="size-10" />
          <h1 className="text-slate-900 text-lg font-semibold">Flocus</h1>
        </div>

        <nav className="flex flex-col gap-1 flex-grow">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive ? 'text-slate-900 bg-background-DEFAULT font-semibold' : 'text-slate-700 hover:bg-background-DEFAULT'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <Home size={20} /> : <Home size={20} />}
                Dashboard
              </>
            )}
          </NavLink>
          <NavLink
            to="/my-day"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive ? 'text-slate-900 bg-background-DEFAULT font-semibold' : 'text-slate-700 hover:bg-background-DEFAULT'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <CalendarDays size={20} /> : <CalendarDays size={20} />}
                My Day
              </>
            )}
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive ? 'text-slate-900 bg-background-DEFAULT font-semibold' : 'text-slate-700 hover:bg-background-DEFAULT'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <ListTodo size={20} /> : <ListTodo size={20} />}
                Tasks
              </>
            )}
          </NavLink>
          <NavLink
            to="/templates"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive ? 'text-slate-900 bg-background-DEFAULT font-semibold' : 'text-slate-700 hover:bg-background-DEFAULT'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <FileText size={20} /> : <FileText size={20} />}
                Templates
              </>
            )}
          </NavLink>
          <NavLink
            to="/categories"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive ? 'text-slate-900 bg-background-DEFAULT font-semibold' : 'text-slate-700 hover:bg-background-DEFAULT'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <Folder size={20} /> : <Folder size={20} />}
                Categories
              </>
            )}
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive ? 'text-slate-900 bg-background-DEFAULT font-semibold' : 'text-slate-700 hover:bg-background-DEFAULT'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <Settings size={20} /> : <Settings size={20} />}
                Settings
              </>
            )}
          </NavLink>
        </nav>

        <div className="pt-4 border-t border-slate-200">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-background-DEFAULT rounded-lg transition-colors w-full text-sm font-medium">
            <LogOut size={20} className="text-slate-700" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
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
