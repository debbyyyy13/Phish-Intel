import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

const ThemeAwareLogo = ({ className = "w-42 h-42", style = {} }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    // Check if dark mode is enabled
    const checkDarkMode = () => {
      // Method 1: Check if html has 'dark' class (most common)
      const htmlElement = document.documentElement;
      const hasDarkClass = htmlElement.classList.contains('dark');
      
      // Method 2: Check CSS variables or computed styles
      const bgColor = window.getComputedStyle(document.body).backgroundColor;
      const isDarkBg = bgColor === 'rgb(15, 23, 42)' || bgColor === 'rgb(3, 7, 18)' || 
                      bgColor.includes('222.2') || // Your dark theme colors
                      window.getComputedStyle(document.documentElement).getPropertyValue('--background').includes('222.2');
      
      // Method 3: Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Priority: CSS class > background color > system preference
      setIsDarkMode(hasDarkClass || isDarkBg || prefersDark);
    };

    // Initial check
    checkDarkMode();

    // Create observer for class changes on html element
    const observer = new MutationObserver(() => {
      checkDarkMode();
    });

    // Watch for changes to the html element's class
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);

    // Cleanup
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  const handleImageError = () => {
    setLogoError(true);
  };

  const handleImageLoad = () => {
    setLogoError(false);
  };

  // Determine which logo to use - FIXED LOGIC
  const logoSrc = isDarkMode 
    ? "/phishguard-logo.png"           // Dark mode page uses dark mode logo
    : "/phishguard-logo(light).png";   // Light mode page uses light mode logo

  const mergedStyle = {
    width: '672px',    // 4x larger (168px * 4)
    height: '672px',   // 4x larger (168px * 4)
    ...style
  };

  if (logoError) {
    return (
      <Shield 
        className={`${className} text-blue-600`}
        style={mergedStyle}
      />
    );
  }

  return (
    <img
      src={logoSrc}
      alt="PhishGuard Logo"
      className={`${className} object-contain`}
      style={mergedStyle}
      onError={handleImageError}
      onLoad={handleImageLoad}
    />
  );
};

export default ThemeAwareLogo;