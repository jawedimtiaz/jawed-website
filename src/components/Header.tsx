import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark') return saved;
      } catch {
        // Storage can be unavailable in private or restricted browser contexts.
      }
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  });

  const location = useLocation();
  const path = location.pathname;

  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        menuToggleRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem('theme', theme);
    } catch {
      // Keep the selected theme for this page session even when persistence is blocked.
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="site-brand" to="/" onClick={closeMenu}>
          <div className="site-brand-icon">JI</div>
          <div className="site-title">
            <span className="site-name">Jawed Imtiaz</span>
            <span className="site-tagline">IT Field Tech &amp; Engineering</span>
          </div>
        </Link>

        <button
          ref={menuToggleRef}
          className="menu-toggle"
          type="button"
          aria-expanded={isOpen}
          aria-controls="primary-nav"
          aria-label="Toggle Navigation Menu"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? '✕ Close' : '☰ Menu'}
        </button>

        <nav id="primary-nav" className={`site-nav ${isOpen ? 'is-open' : ''}`}>
          <Link
            className="nav-item"
            to="/guides"
            onClick={closeMenu}
            aria-current={path.startsWith('/guides') || path.startsWith('/notes') || path.startsWith('/field-guides') ? 'page' : undefined}
          >
            Guides
          </Link>

          <Link
            className="nav-item"
            to="/tools"
            onClick={closeMenu}
            aria-current={path.startsWith('/tools') || path.startsWith('/diagnostic-tools') ? 'page' : undefined}
          >
            Tools
          </Link>

          <Link
            className="nav-item"
            to="/services"
            onClick={closeMenu}
            aria-current={path.startsWith('/services') ? 'page' : undefined}
          >
            Services
          </Link>

          <Link
            className="nav-item"
            to="/about"
            onClick={closeMenu}
            aria-current={path.startsWith('/about') ? 'page' : undefined}
          >
            About
          </Link>

          <Link
            className="nav-item"
            to="/ai"
            onClick={closeMenu}
            aria-current={path === '/ai' ? 'page' : undefined}
          >
            Ask AI
          </Link>

          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>

          <Link
            className="nav-cta"
            to="/contact"
            onClick={closeMenu}
          >
            Get in Touch →
          </Link>
        </nav>
      </div>
    </header>
  );
};
