import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function LoginCard({ onSubmit, initialMode = "signin" }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "signup" && password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    onSubmit({ email, password, mode });
  };

  return (
    <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8">
      <div className="flex justify-center mb-6">
        <img
          src="/logo.png"
          alt="App Logo"
          className="w-24 h-24 object-contain"
        />
      </div>
      <div className="flex justify-around mb-6">
        <button
          className={`px-4 py-2 font-semibold ${
            mode === "signin"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setMode("signin")}
        >
          Sign In
        </button>
        <button
          className={`px-4 py-2 font-semibold ${
            mode === "signup"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setMode("signup")}
        >
          Sign Up
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300"
          required
        />
        {mode === "signup" && (
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300"
            required
          />
        )}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {mode === "signin" ? "Sign In" : "Create Account"}
        </button>
      </form>
      {mode === "signin" && (
        <p className="mt-4 text-sm text-center text-gray-500">
          Don’t have an account?{" "}
          <button
            type="button"
            className="text-blue-600 hover:underline"
            onClick={() => setMode("signup")}
          >
            Create one
          </button>
        </p>
      )}
    </div>
  );
}
