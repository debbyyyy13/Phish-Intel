// src/App.jsx - FIXED VERSION (Remove Router from here if it exists elsewhere)
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom"; // ✅ No BrowserRouter import
import { AuthProvider } from "./contexts/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SubmitEmail from "./pages/SubmitEmail";
import Quarantine from "./pages/Quarantine";
import Signup from "./pages/Signup";

// Simple Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem("phish_token");
  return token ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      {/* Logo header - you can keep this or move to a Header component */}
      <div className="flex items-center justify-center py-4 bg-gray-100 shadow-md">
        <img
          src="/phishintel-logo.png"
          alt="PhishGuard Logo"
          className="w-16 h-16 mr-3"
        />
        <h1 className="text-2xl font-bold text-blue-600">PhishGuard</h1>
      </div>

      {/* Routes - NO Router wrapper here */}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submit"
          element={
            <ProtectedRoute>
              <SubmitEmail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quarantine"
          element={
            <ProtectedRoute>
              <Quarantine />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}