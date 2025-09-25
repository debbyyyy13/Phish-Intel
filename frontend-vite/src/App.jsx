import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SubmitEmail from "./pages/SubmitEmail";
import Quarantine from "./pages/Quarantine";
import Signup from "./pages/Signup";

export default function App() {
  const token = sessionStorage.getItem("phish_token");

  const PrivateRoute = ({ children }) => {
    return token ? children : <Navigate to="/login" replace />;
  };

  return (
    <>
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
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/submit"
          element={
            <PrivateRoute>
              <SubmitEmail />
            </PrivateRoute>
          }
        />
        <Route
          path="/quarantine"
          element={
            <PrivateRoute>
              <Quarantine />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
