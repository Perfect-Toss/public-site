import './App.css'

import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  MachinesTabPage,
  TabletTypesTabPage,
  TabletsTabPage,
} from './components/AdminDevicesPage/DeviceTabWrappers'

import AccountPage from './components/AccountPage'
import AddUserPage from './components/AddUserPage'
import AdminAddOrganizationPage from './components/AdminAddOrganizationPage'
import AdminDevicesPage from './components/AdminDevicesPage'
import AdminOrganizationsPage from './components/AdminOrganizationsPage'
import AdminPage from './components/AdminPage'
import AdminUsersPage from './components/AdminUsersPage'
import { AuthProvider } from './contexts/AuthContext'
import BulkImportPage from './components/BulkImportPage'
import DashboardPage from './components/DashboardPage'
import EditOrganizationPage from './components/AdminOrganizationsPage/EditOrganizationPage'
import HomePage from './components/HomePage'
import HomeView from './components/HomePage/views/HomeView'
import Login from './components/Login'
import MachineFormPage from './components/AdminMachinesPage/MachineFormPage'
import MembersView from './components/OrganizationPage/views/MembersView'
import OrganizationPage from './components/OrganizationPage'
import OrganizationsPage from './components/OrganizationsPage'
import OverviewView from './components/OrganizationPage/views/OverviewView'
import SettingsView from './components/OrganizationPage/views/SettingsView'
import SubOrgsView from './components/OrganizationPage/views/SubOrgsView'
import TabletFormPage from './components/AdminTabletsPage/TabletFormPage'
import TabletTypeFormPage from './components/AdminTabletTypesPage/TabletTypeFormPage'
import UserDetailPage from './components/UserDetailPage'
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
          <Route path="organizations">
            <Route index element={<AdminOrganizationsPage />} />
            <Route path="new" element={<AdminAddOrganizationPage />} />
            <Route path=":orgId/edit" element={<EditOrganizationPage />} />
          </Route>
          <Route path="devices" element={<AdminDevicesPage />}>
            <Route index element={<Navigate to="machines" replace />} />
            <Route path="machines" element={<MachinesTabPage />} />
            <Route path="tablets" element={<TabletsTabPage />} />
            <Route path="tablet-types" element={<TabletTypesTabPage />} />
          </Route>
          <Route path="devices/machines/new" element={<MachineFormPage />} />
          <Route path="devices/machines/:id/edit" element={<MachineFormPage />} />
          <Route path="devices/tablets/new" element={<TabletFormPage />} />
          <Route path="devices/tablets/:id/edit" element={<TabletFormPage />} />
          <Route path="devices/tablet-types/new" element={<TabletTypeFormPage />} />
          <Route path="devices/tablet-types/:id/edit" element={<TabletTypeFormPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/new" element={<AddUserPage />} />
          <Route path="users/import" element={<BulkImportPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
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
