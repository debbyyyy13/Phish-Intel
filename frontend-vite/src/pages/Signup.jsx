import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";

const Signup = () => {
  const { signup, loginWithGoogle } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  // toggle for password visibility (auto hides after 5s)
  const togglePasswordVisibility = (field) => {
    if (field === "password") {
      setShowPassword(true);
      setTimeout(() => setShowPassword(false), 5000);
    } else {
      setShowConfirmPassword(true);
      setTimeout(() => setShowConfirmPassword(false), 5000);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // map React formData → Flask backend payload
    const payload = {
      name: formData.username,
      email: formData.email,
      password: formData.password,
      confirm_password: formData.confirmPassword,
    };

    console.log("Payload being sent:", payload);

    try {
      await signup(payload);
    } catch (err) {
      setError(err.message || "Signup failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-bold text-center mb-4">Create Account</h2>
        {error && <p className="text-red-500 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block mb-1">Username</label>
            <div className="flex items-center border rounded px-2">
              <User className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full p-2 outline-none"
                placeholder="Enter your name"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block mb-1">Email</label>
            <div className="flex items-center border rounded px-2">
              <Mail className="w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2 outline-none"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block mb-1">Password</label>
            <div className="flex items-center border rounded px-2">
              <Lock className="w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full p-2 outline-none"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("password")}
                className="p-1"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-500" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block mb-1">Confirm Password</label>
            <div className="flex items-center border rounded px-2">
              <Lock className="w-5 h-5 text-gray-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full p-2 outline-none"
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("confirm")}
                className="p-1"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-500" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded p-2 hover:bg-blue-700 transition"
          >
            Create Account
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-4">
          <hr className="flex-grow border-gray-300" />
          <span className="mx-2 text-gray-400">OR</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Google Login */}
        <button
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-2 border rounded p-2 hover:bg-gray-50 transition"
        >
          <img
            src="https://www.svgrepo.com/show/355037/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Continue with Google
        </button>
      </div>
    </div>
  );
};

export default Signup;
