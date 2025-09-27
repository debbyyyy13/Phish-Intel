import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import ThemeAwareLogo from './ThemeAwareLogo';

// Theme Toggle Component
const ThemeToggle = () => {
  const toggleTheme = () => {
    const htmlElement = document.documentElement;
    if (htmlElement.classList.contains('dark')) {
      htmlElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      htmlElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  const isDarkMode = document.documentElement.classList.contains('dark');
  
  return (
    <button 
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title="Toggle theme"
    >
      {isDarkMode ? '🌞' : '🌙'}
    </button>
  );
};

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Don't show header on login/signup pages
  if (['/login', '/signup'].includes(location.pathname)) {
    return null;
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="w-full px-6 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center h-32">
          {/* Logo Section - 4x Larger Logo */}
          <div className="flex items-center space-x-8 min-w-0 flex-1 max-w-4xl">
            <div className="flex-shrink-0">
              <ThemeAwareLogo className="w-168 h-168" />
            </div>
            <div className="min-w-0">
              <h1 className="text-6xl font-bold text-gray-900 truncate">PhishGuard</h1>
            </div>
          </div>

          {/* Center spacing */}
          <div className="flex-1"></div>

          {/* Navigation - Right side */}
          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <nav className="hidden md:flex space-x-8">
                  <Link 
                    to="/dashboard" 
                    className="text-gray-600 hover:text-gray-900 font-medium text-lg transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/submit" 
                    className="text-gray-600 hover:text-gray-900 font-medium text-lg transition-colors"
                  >
                    Submit Email
                  </Link>
                  <Link 
                    to="/quarantine" 
                    className="text-gray-600 hover:text-gray-900 font-medium text-lg transition-colors"
                  >
                    Quarantine
                  </Link>
                </nav>
                
                {/* Theme Toggle for Authenticated Users */}
                <ThemeToggle />
                
                {/* User Menu */}
                <div className="flex items-center space-x-4 border-l border-gray-200 pl-6">
                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {user?.name || user?.email}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-1 text-gray-600 hover:text-red-600 font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button 
                  className="text-gray-600 hover:text-gray-900 font-medium text-lg transition-colors"
                  onClick={() => {/* Learn More functionality - to be added later */}}
                >
                  Learn More
                </button>
                
                {/* Theme Toggle for Non-Authenticated Users */}
                <ThemeToggle />
                
                <Link 
                  to="/login" 
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium text-lg transition-colors shadow-sm"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;