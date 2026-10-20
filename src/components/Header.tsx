import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  });

  const location = useLocation();
  const path = location.pathname;

  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
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
