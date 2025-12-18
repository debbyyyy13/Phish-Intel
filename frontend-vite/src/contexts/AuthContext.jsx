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
    setLoading(true);
    const response = await api.post("/auth/login", { email, password });
    const { access_token, user: userData } = response.data;

    sessionStorage.setItem("phish_token", access_token);
    sessionStorage.setItem("phish_user", JSON.stringify(userData));

    api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    setUser(userData);

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    
    let errorMessage = "Login failed";
    
    // Check for network errors (timeout, no connection, etc.)
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      errorMessage = "Network error: Unable to connect to server. Please check your connection and try again.";
    } 
    // Check if it's a timeout
    else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      errorMessage = "Network timeout: The server is taking too long to respond. Please try again.";
    }
    // Authentication errors (401)
    else if (error.response?.status === 401) {
      errorMessage = "Email or password incorrect. Please try again.";
    }
    // Server errors (500)
    else if (error.response?.status === 500) {
      errorMessage = "Server error: Something went wrong. Please try again later.";
    }
    // Bad request (400)
    else if (error.response?.status === 400) {
      errorMessage = error.response?.data?.error || "Invalid request. Please check your input.";
    }
    // Any other error with response data
    else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }

    return {
      success: false,
      error: errorMessage,
    };
  } finally {
    setLoading(false);
  }
};

  // 🔹 Login with Google
  const loginWithGoogle = () => {
    window.location.href = `${
      import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"
    }/auth/google`;
  };

  // 🔹 Signup (fixed mapping for Flask)
  const signup = async (formData) => {
    try {
      setLoading(true);
      
      // Ensure payload matches Flask backend
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirmPassword || formData.password, // Handle both cases
      };

      console.log("Signup payload sent to backend:", payload);

      const response = await api.post("/auth/signup", payload);
      const { access_token, user: newUser } = response.data;

      sessionStorage.setItem("phish_token", access_token);
      sessionStorage.setItem("phish_user", JSON.stringify(newUser));

      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      setUser(newUser);

      return { success: true, user: newUser };
    } catch (error) {
      console.error("Signup error:", error);
      
      // Better error handling
      let errorMessage = "Signup failed";
      
      if (error.code === 'ERR_NETWORK') {
        errorMessage = "Cannot connect to server. Please ensure the backend is running.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
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