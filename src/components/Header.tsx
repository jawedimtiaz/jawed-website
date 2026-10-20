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
        <Link className="site-name" to="/" onClick={closeMenu}>
          Jawed Imtiaz
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={isOpen}
          aria-controls="primary-nav"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? 'Close' : 'Menu'}
        </button>
        <nav id="primary-nav" className={`site-nav ${isOpen ? 'is-open' : ''}`}>
          <Link
            to="/"
            onClick={closeMenu}
            aria-current={path === '/' ? 'page' : undefined}
          >
            Home
          </Link>
          <Link
            to="/about"
            onClick={closeMenu}
            aria-current={path.startsWith('/about') ? 'page' : undefined}
          >
            About
          </Link>

          <details className="nav-group">
            <summary>Work</summary>
            <div className="nav-group-menu">
              <Link to="/work" onClick={closeMenu} aria-current={path === '/work' ? 'page' : undefined}>
                Overview
              </Link>
              <Link to="/work/experience" onClick={closeMenu} aria-current={path === '/work/experience' ? 'page' : undefined}>
                Experience
              </Link>
              <Link to="/work/skills" onClick={closeMenu} aria-current={path === '/work/skills' ? 'page' : undefined}>
                Skills
              </Link>
              <Link to="/work/certifications" onClick={closeMenu} aria-current={path === '/work/certifications' ? 'page' : undefined}>
                Certifications
              </Link>
              <Link to="/work/projects" onClick={closeMenu} aria-current={path === '/work/projects' ? 'page' : undefined}>
                Projects
              </Link>
            </div>
          </details>

          <details className="nav-group">
            <summary>Explore</summary>
            <div className="nav-group-menu">
              <Link to="/topics" onClick={closeMenu} aria-current={path.startsWith('/topics') ? 'page' : undefined}>
                Topics
              </Link>
              <Link to="/notes" onClick={closeMenu} aria-current={path.startsWith('/notes') ? 'page' : undefined}>
                Practical Notes
              </Link>
              <Link to="/blog" onClick={closeMenu} aria-current={path.startsWith('/blog') ? 'page' : undefined}>
                Blog
              </Link>
              <Link to="/resources" onClick={closeMenu} aria-current={path.startsWith('/resources') ? 'page' : undefined}>
                Resources
              </Link>
            </div>
          </details>

          <Link
            to="/tools"
            onClick={closeMenu}
            aria-current={path.startsWith('/tools') ? 'page' : undefined}
          >
            Tools
          </Link>
          <Link
            to="/ai"
            onClick={closeMenu}
            aria-current={path.startsWith('/ai') ? 'page' : undefined}
          >
            Ask AI
          </Link>
          <Link
            to="/contact"
            onClick={closeMenu}
            aria-current={path.startsWith('/contact') ? 'page' : undefined}
          >
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
};
