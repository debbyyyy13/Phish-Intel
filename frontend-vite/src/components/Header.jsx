// src/components/Header.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, LogOut, User } from 'lucide-react';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Don't show header on login/signup pages
  if (['/login', '/signup'].includes(location.pathname)) {
    return null;
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">PhishGuard</h1>
          </Link>

          {/* Navigation */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-6">
                <Link 
                  to="/dashboard" 
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Dashboard
                </Link>
                <Link 
                  to="/submit" 
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Submit Email
                </Link>
                <Link 
                  to="/quarantine" 
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Quarantine
                </Link>
              </nav>
              
              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {user?.name || user?.email}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 text-gray-600 hover:text-red-600 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link 
                to="/login" 
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Login
              </Link>
              <Link 
                to="/signup" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;