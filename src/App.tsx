import './App.css'

import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import AccountPage from './components/AccountPage'
import AdminPage from './components/AdminPage'
import { AuthProvider } from './contexts/AuthContext'
import DashboardPage from './components/DashboardPage'
import HomePage from './components/HomePage'
import HomeView from './components/HomePage/views/HomeView'
import Login from './components/Login'
import OrganizationPage from './components/OrganizationPage'
import OrganizationsPage from './components/OrganizationsPage'
import OverviewView from './components/OrganizationPage/views/OverviewView'
import MembersView from './components/OrganizationPage/views/MembersView'
import SubOrgsView from './components/OrganizationPage/views/SubOrgsView'
import SettingsView from './components/OrganizationPage/views/SettingsView'
import VideosPage from './components/VideosPage'
import { useAuth } from './contexts/useAuth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function LoginRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={
        <LoginRoute>
          <Login />
        </LoginRoute>
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      }>
        <Route index element={<HomeView />} />
        <Route path="videos" element={<VideosPage />} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="organizations/:id" element={<OrganizationPage />}>
          <Route index element={<OverviewView />} />
          <Route path="members" element={<MembersView />} />
          <Route path="sub-orgs" element={<SubOrgsView />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
        <Route path="admin">
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="*" element={<AdminPage />} />
        </Route>
        <Route path="account" element={<AccountPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
