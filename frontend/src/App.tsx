import React from 'react';
import { Route, Routes, Navigate, NavLink, Outlet } from 'react-router-dom';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import HomeIcon from '@mui/icons-material/Home';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import DescriptionIcon from '@mui/icons-material/Description';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import Home from './pages/Home';
import About from './pages/About';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TemplatesPage from './pages/TemplatesPage';
import EditTemplatePage from './pages/EditTemplatePage';
import { useAuth } from './context/AuthContext';
import CategoriesPage from './pages/CategoriesPage';
import UserSettingsPage from './pages/UserSettingsPage';


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
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    // AuthContext's logout already handles navigation to /login
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      <aside className="flex flex-col w-64 bg-white border-r border-slate-200 p-4 space-y-4 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="bg-slate-700 rounded-full size-10 flex items-center justify-center text-white font-semibold text-lg">
            {user ? user.username.substring(0, 1).toUpperCase() : <RocketLaunchOutlinedIcon />}
          </div>
          <h1 className="text-slate-900 text-lg font-semibold">Flocus</h1>
        </div>

        <nav className="flex flex-col gap-1 flex-grow">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive ? 'text-slate-900 bg-slate-100 font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <HomeIcon sx={{ fontSize: '1.25rem' }} /> : <HomeOutlinedIcon sx={{ fontSize: '1.25rem' }} />}
                Dashboard
              </>
            )}
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive ? 'text-slate-900 bg-slate-100 font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <ListAltIcon sx={{ fontSize: '1.25rem' }} /> : <ListAltOutlinedIcon sx={{ fontSize: '1.25rem' }} />}
                Tasks
              </>
            )}
          </NavLink>
          <NavLink
            to="/templates"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive ? 'text-slate-900 bg-slate-100 font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <DescriptionIcon sx={{ fontSize: '1.25rem' }} /> : <DescriptionOutlinedIcon sx={{ fontSize: '1.25rem' }} />}
                Templates
              </>
            )}
          </NavLink>
          <NavLink
            to="/categories"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive ? 'text-slate-900 bg-slate-100 font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <FolderIcon sx={{ fontSize: '1.25rem' }} /> : <FolderOutlinedIcon sx={{ fontSize: '1.25rem' }} />}
                Categories
              </>
            )}
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive ? 'text-slate-900 bg-slate-100 font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <SettingsIcon sx={{ fontSize: '1.25rem' }} /> : <SettingsOutlinedIcon sx={{ fontSize: '1.25rem' }} />}
                Settings
              </>
            )}
          </NavLink>
        </nav>

        <div className="pt-4 border-t border-slate-200">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors w-full text-sm font-medium">
            <LogoutOutlinedIcon sx={{ color: 'rgb(71 85 105)' }} />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

function App() {
  const { isLoading: authContextIsLoading } = useAuth();

  if (authContextIsLoading) {
    return <div className="flex items-center justify-center h-screen bg-slate-100"><p className="text-slate-700">Loading application...</p></div>;
  }

  return (
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
        <Route index element={<Home />} />
        <Route path="about" element={<About />} /> {/* Kept for now, not in new nav */}
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="tasks" element={<div>Tasks Page Placeholder</div>} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="templates/new" element={<EditTemplatePage />} />
        <Route path="templates/edit/:templateId" element={<EditTemplatePage />} />
        <Route path="settings" element={<UserSettingsPage />} />
        {/* Fallback for any other authenticated path under "/" */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
