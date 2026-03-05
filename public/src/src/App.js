import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Filters from './pages/Filters';
import Alerts from './pages/Alerts';
import Account from './pages/Account';
import AuthCallback from './pages/AuthCallback';
import Login from './pages/Login';
import Upgrade from './pages/Upgrade';
import './styles/global.css';

function ProtectedRoute({ children }) {
  const { user, loading, isSubscribed } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSubscribed) return <Navigate to="/upgrade" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="radar-pulse">
        <div className="pulse-ring"></div>
        <div className="pulse-ring delay-1"></div>
        <div className="pulse-ring delay-2"></div>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="#00FF85" strokeWidth="2"/>
          <path d="M16 16 L28 10" stroke="#00FF85" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="16" cy="16" r="3" fill="#00FF85"/>
        </svg>
      </div>
      <p>Loading ClearanceRadar...</p>
    </div>
  );
}

function AppRoutes() {
  const { user, loading, isSubscribed } = useAuth();
  if (loading) return <LoadingScreen />;
  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/upgrade" element={<Upgrade />} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/filters" element={<ProtectedRoute><Filters /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#161B27',
              color: '#FFFFFF',
              border: '1px solid #00FF85',
              borderRadius: '8px',
            },
            success: {
              iconTheme: { primary: '#00FF85', secondary: '#0A0F1E' }
            }
          }}
        />
      </Router>
    </AuthProvider>
  );
}