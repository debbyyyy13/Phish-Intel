import React, { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="bg-[#07143a] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/phishintel-logo.png"
              alt="PhishIntel"
              className="w-10 h-10 object-contain"
            />
            <span className="font-semibold text-lg">PhishIntel</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/" className="hover:text-blue-400">Dashboard</Link>
            <Link to="/quarantine" className="hover:text-blue-400">Quarantine</Link>
            <Link to="/reports" className="hover:text-blue-400">Reports</Link>
            <Link to="/settings" className="hover:text-blue-400">Settings</Link>
          </nav>

          {/* Right section: profile */}
          <div className="hidden md:flex items-center gap-4">
            <div className="relative group">
              <button className="w-9 h-9 rounded-full bg-white text-[#07143a] font-bold flex items-center justify-center">
                D
              </button>
              <div className="absolute right-0 mt-2 w-40 bg-white text-[#07143a] rounded-lg shadow-lg hidden group-hover:block">
                <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">Profile</Link>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Logout</button>
              </div>
            </div>
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden">
            <button
              aria-label="Open menu"
              className="p-2"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#07143a] px-4 py-2 space-y-2">
          <Link to="/" className="block hover:text-blue-400">Dashboard</Link>
          <Link to="/quarantine" className="block hover:text-blue-400">Quarantine</Link>
          <Link to="/reports" className="block hover:text-blue-400">Reports</Link>
          <Link to="/settings" className="block hover:text-blue-400">Settings</Link>
          <button className="block text-left w-full hover:text-blue-400">Logout</button>
        </div>
      )}
      
      {/* Divider */}
      <div className="h-0.5 bg-white/10"></div>
    </header>
  )
}
