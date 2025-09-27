import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api";

const AuthContext = createContext();

// ✅ useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    const token = sessionStorage.getItem("phish_token");
    const userData = sessionStorage.getItem("phish_user");

    if (token && userData) {
      try {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        setUser(JSON.parse(userData));
      } catch (error) {
        // Clear invalid data
        sessionStorage.removeItem("phish_token");
        sessionStorage.removeItem("phish_user");
      }
    }
    setLoading(false);
  }, []);

  // 🔹 Login
  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { access_token, user: userData } = response.data;

      sessionStorage.setItem("phish_token", access_token);
      sessionStorage.setItem("phish_user", JSON.stringify(userData));

      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      setUser(userData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Login failed",
      };
    }
  };

  // 🔹 Login with Google
  const loginWithGoogle = () => {
    window.location.href = `${
      import.meta.env.VITE_API_URL || "http://localhost:5000"
    }/api/v1/auth/google`;
  };

  // 🔹 Signup (fixed mapping for Flask)
  const signup = async (formData) => {
    try {
      // Ensure payload matches Flask backend (snake_case keys)
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirm_password,
      };

      console.log("Signup payload sent to backend:", payload);

      const response = await api.post("/auth/signup", payload);
      const { access_token, user: newUser } = response.data;

      sessionStorage.setItem("phish_token", access_token);
      sessionStorage.setItem("phish_user", JSON.stringify(newUser));

      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      setUser(newUser);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Signup failed",
      };
    }
  };

  // 🔹 Logout
  const logout = () => {
    sessionStorage.removeItem("phish_token");
    sessionStorage.removeItem("phish_user");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithGoogle,
        signup,
        logout,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
