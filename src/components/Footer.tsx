import React from 'react';
import { Link } from 'react-router-dom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface FooterProps {
  onOpenCookieModal?: () => void;
  onOpenShortcutsModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenCookieModal, onOpenShortcutsModal }) => {
  const currentYear = new Date().getFullYear();
  const { openHelpModal } = useKeyboardShortcuts();

  const handleOpenShortcuts = () => {
    if (onOpenShortcutsModal) {
      onOpenShortcutsModal();
    }
    openHelpModal();
    window.dispatchEvent(new CustomEvent('open-shortcuts-modal'));
  };

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Column 1: Company/Author Bio & Expertise Statement */}
          <div className="footer-col">
            <h4>Jawed Imtiaz — IT Field Tech</h4>
            <p>
              Professional IT Field Engineer specializing in Service Desk operations, workplace technology, Apple macOS &amp; Jamf device management, and Microsoft enterprise systems. Delivering practical field guides, diagnostic utilities, and IT dispatch services.
            </p>
          </div>

          {/* Column 2: Quick Links to Main Sections */}
          <div className="footer-col">
            <h4>Main Sections</h4>
            <ul className="footer-links">
              <li><Link to="/guides">Guides &amp; KB</Link></li>
              <li><Link to="/tools">Tools</Link></li>
              <li><Link to="/services">Services</Link></li>
              <li><Link to="/work">Work &amp; Portfolio</Link></li>
              <li><Link to="/about">About Jawed</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>

          {/* Column 3: Featured Diagnostic Utilities */}
          <div className="footer-col">
            <h4>Featured Utilities</h4>
            <ul className="footer-links">
              <li><Link to="/tools/ipv4-subnet-calculator">IPv4 Subnet &amp; CIDR Calculator</Link></li>
              <li><Link to="/tools/server-rack-power-btu-calculator">Server Rack Power &amp; BTU Calculator</Link></li>
              <li><Link to="/tools/it-troubleshooting-assistant">IT Troubleshooting Assistant</Link></li>
              <li><Link to="/tools/service-desk-note-formatter">Service Desk Note Formatter</Link></li>
              <li><Link to="/tools/ai-prompt-builder">AI Prompt Builder</Link></li>
              <li><Link to="/ai">Jawed AI Assistant</Link></li>
            </ul>
          </div>

          {/* Column 4: Legal & Compliance Links */}
          <div className="footer-col">
            <h4>Legal &amp; Compliance</h4>
            <ul className="footer-links">
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/cookies">Cookie Policy</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                <button
                  type="button"
                  className="cookie-trigger-btn"
                  onClick={onOpenCookieModal}
                >
                  ⚙ Cookie Preferences
                </button>
                <button
                  type="button"
                  className="cookie-trigger-btn"
                  onClick={handleOpenShortcuts}
                >
                  Keyboard Shortcuts
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <p>© {currentYear} Jawed Imtiaz. All rights reserved. IT Field Support &amp; Workplace Engineering.</p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/privacy">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms">Terms of Service</Link>
            <span>•</span>
            <Link to="/cookies">Cookie Preferences</Link>
            <span>•</span>
            <button
              type="button"
              onClick={handleOpenShortcuts}
              style={{
                background: 'transparent',
                border: 0,
                padding: 0,
                color: 'inherit',
                font: 'inherit',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              Keyboard Shortcuts
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
