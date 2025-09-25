// src/pages/Signup.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";   // ✅ fixed import

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/signup", {
        name,
        email,
        password,
        confirm_password: confirm,
      });

      const token = res.data.access_token;
      const user = res.data.user;

      // store in sessionStorage
      sessionStorage.setItem("phish_token", token);
      sessionStorage.setItem("phish_user", JSON.stringify(user));

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
      <div className="w-full max-w-lg p-6">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/phishintel-logo.png"
            alt="logo"
            className="w-40 h-40 object-contain"
          />
          <h1 className="text-2xl font-extrabold mt-3 text-[#0f172a]">
            Create an account
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          {error && (
            <div className="bg-red-50 text-red-700 p-2 rounded mb-3">
              {error}
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Confirm password</label>
              <input
                required
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e40af] text-white py-2 rounded"
            >
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>

          <div className="text-sm text-gray-500 mt-4">
            Already have an account?{" "}
            <a className="text-blue-600" href="/login">
              Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
