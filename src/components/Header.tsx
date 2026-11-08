import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CommandPalette, toggleSearchPalette } from './CommandPalette';
import { ThemeToggle } from './ThemeToggle';

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  const location = useLocation();
  const path = location.pathname;

  const closeMenu = () => setIsOpen(false);

  // Retain global keyboard listener so pressing ⌘K or Ctrl+K anywhere on the site opens the search palette
  useEffect(() => {
    const handleGlobalSearchShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        (event as unknown as Record<string, boolean>).__searchHandledByHeader = true;
        toggleSearchPalette();
      }
    };

    window.addEventListener('keydown', handleGlobalSearchShortcut);
    return () => window.removeEventListener('keydown', handleGlobalSearchShortcut);
  }, []);

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
        {/* Left: Logo (JI Jawed Imtiaz) */}
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

        {/* Center/Right: Core Navigation Links (Guides, Tools, Services, About) + Far Right: Single Dark/Light toggle icon + Get in Touch → button */}
        <nav
          id="primary-nav"
          aria-label="Primary Navigation"
          className={`site-nav ${isOpen ? 'is-open' : ''}`}
        >
          <Link
            className="nav-item"
            to="/guides"
            onClick={closeMenu}
            aria-current={
              path.startsWith('/guides') ||
              path.startsWith('/notes') ||
              path.startsWith('/field-guides')
                ? 'page'
                : undefined
            }
          >
            Guides
          </Link>
          <Link
            className="nav-item"
            to="/tools"
            onClick={closeMenu}
            aria-current={
              path.startsWith('/tools') || path.startsWith('/diagnostic-tools')
                ? 'page'
                : undefined
            }
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

          <ThemeToggle />

          <Link
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-sky-500 hover:bg-sky-400 shadow-md shadow-sky-500/20 transition-all"
            style={{ textDecoration: 'none' }}
            to="/contact"
            onClick={closeMenu}
          >
            Get in Touch →
          </Link>
        </nav>

        {/* Headless Command Palette Modal mounted globally for ⌘K / Ctrl+K & Search triggers */}
        <CommandPalette hideTrigger onNavigated={closeMenu} />
      </div>
    </header>
  );
};

export const Navbar = Header;
export default Header;

