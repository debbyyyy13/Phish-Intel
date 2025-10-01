// src/App.jsx - Updated with Extension Route
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Header from "./components/Header";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Extension from "./pages/Extension";
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
      {/* Global Header - will conditionally show based on route */}
      <Header />

      {/* Routes */}
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
          path="/extension"
          element={
            <ProtectedRoute>
              <Extension />
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