import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const path = location.pathname;

  const closeMenu = () => setIsOpen(false);

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
            to="/field-guides"
            onClick={closeMenu}
            aria-current={path.startsWith('/notes') || path.startsWith('/field-guides') ? 'page' : undefined}
          >
            Field Guides
          </Link>

          <Link
            className="nav-item"
            to="/tools"
            onClick={closeMenu}
            aria-current={path.startsWith('/tools') || path.startsWith('/diagnostic-tools') ? 'page' : undefined}
          >
            Diagnostic Tools
          </Link>

          <Link
            className="nav-item"
            to="/services"
            onClick={closeMenu}
            aria-current={path.startsWith('/services') ? 'page' : undefined}
          >
            Services &amp; Dispatch
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
            to="/contact"
            onClick={closeMenu}
            aria-current={path.startsWith('/contact') ? 'page' : undefined}
          >
            Contact
          </Link>

          <Link
            className="nav-item nav-cta"
            to="/ai"
            onClick={closeMenu}
          >
            Ask AI
          </Link>
        </nav>
      </div>
    </header>
  );
};
