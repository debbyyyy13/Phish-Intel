import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, ChevronDown } from 'lucide-react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Hide header on login/signup pages
  if (['/login', '/signup'].includes(location.pathname)) {
    return null;
  }

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 relative">
      <div className="w-full px-6 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center h-28">
          {/* Logo Section */}
          <div className="flex items-center space-x-6 min-w-0 flex-1 max-w-4xl">
            <div className="flex-shrink-0">
              <ThemeAwareLogo className="w-40 h-40" />
            </div>
            <div className="min-w-0">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white truncate">
                PhishGuard
              </h1>
            </div>
          </div>

          {/* Center spacing */}
          <div className="flex-1"></div>

          {/* Navigation */}
          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <nav className="hidden md:flex space-x-8">
                  <Link to="/dashboard" className={navLinkClasses}>Dashboard</Link>
                  <Link to="/quarantine" className={navLinkClasses}>Quarantine</Link>
                  <Link to="/training" className={navLinkClasses}>Training</Link>
                  <Link to="/submit" className={navLinkClasses}>Submit Email</Link>
                  <Link to="/extension" className={navLinkClasses}>Extension</Link>
                </nav>
                
                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Profile Dropdown */}
                <div className="relative" ref={menuRef}>
                  <button 
                    onClick={() => setMenuOpen(!menuOpen)} 
                    className="flex items-center space-x-2 border-l border-gray-200 dark:border-gray-700 pl-6 focus:outline-none"
                  >
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {user?.name || user?.email}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                      <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                        <li>
                          <Link 
                            to="/profile" 
                            className={dropdownItemClasses} 
                            onClick={() => setMenuOpen(false)}
                          >
                            Customize Avatar
                          </Link>
                        </li>
                        <li>
                          <Link 
                            to="/settings" 
                            className={dropdownItemClasses} 
                            onClick={() => setMenuOpen(false)}
                          >
                            Settings
                          </Link>
                        </li>
                        <li>
                          <button 
                            className={`${dropdownItemClasses} w-full text-left`} 
                            onClick={() => setMenuOpen(false)}
                          >
                            Download Mobile App
                          </button>
                        </li>
                        <li>
                          <button 
                            className={`${dropdownItemClasses} w-full text-left`} 
                            onClick={() => setMenuOpen(false)}
                          >
                            Help & Support
                          </button>
                        </li>
                        <li>
                          <button 
                            onClick={() => { logout(); setMenuOpen(false); }}
                            className={`${dropdownItemClasses} w-full text-left text-red-600 dark:text-red-400`}
                          >
                            Logout
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button 
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium text-lg transition-colors"
                  onClick={() => {/* Learn More functionality - placeholder */}}
                >
                  Learn More
                </button>

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

// Utility classes
const navLinkClasses = "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium text-lg transition-colors";
const dropdownItemClasses = "block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700";

export default Header;
