import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SiteSearchBar } from './SiteSearchBar';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ThemeToggle } from './ThemeToggle';

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
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

        {/* Site-Wide Search Bar Powered by aiKnowledgeEngine */}
        <div className="header-search-slot">
          <SiteSearchBar onNavigated={closeMenu} />
        </div>

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
          {!isStandalone && !isInstalled && (isInstallable || isIOS) && (
            <button
              type="button"
              className="nav-item pwa-install-nav-btn"
              onClick={() => {
                closeMenu();
                if (isInstallable) {
                  install();
                } else {
                  window.dispatchEvent(new CustomEvent('open-pwa-install'));
                }
              }}
              aria-label="Install Jawed Imtiaz App"
            >
              📲 Install App
            </button>
          )}
          <ThemeToggle />
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
