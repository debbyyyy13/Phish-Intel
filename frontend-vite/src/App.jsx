import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SubmitEmail from './pages/SubmitEmail';
import Quarantine from './pages/Quarantine';
import Signup from './pages/Signup';

export default function App() {
  const token = localStorage.getItem('phish_token');
  return (
    <BrowserRouter>
      {/* Logo header */}
      <div className="flex items-center justify-center py-4 bg-gray-100 shadow-md">
        <img
          src="/phishintel-logo.png"
          alt="PhishIntel Logo"
          className="w-16 h-16 mr-3"
        />
        <h1 className="text-2xl font-bold text-blue-600">PhishIntel</h1>
      </div>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="*" element={<Navigate to="/" replace />} />

        <Route
          path="/dashboard"
          element={token ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/submit"
          element={token ? <SubmitEmail /> : <Navigate to="/login" />}
        />
        <Route
          path="/quarantine"
          element={token ? <Quarantine /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={<Navigate to={token ? '/dashboard' : '/login'} />}
        />
      </Routes>
    </BrowserRouter>
  );
}
