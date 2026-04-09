import './App.css'

import Login from './components/Login'
import HomePage from './components/HomePage'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/useAuth'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

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
      
      <Route path="/*" element={
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      } />
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
