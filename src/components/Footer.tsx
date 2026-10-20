import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface FooterProps {
  onOpenCookieModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenCookieModal }) => {
  const currentYear = new Date().getFullYear();

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
            <div className="footer-compliance-badge">
              <span>✓ Google AdSense Publisher Compliant</span>
            </div>
          </div>

          {/* Column 2: Quick Links to Main Sections */}
          <div className="footer-col">
            <h4>Main Sections</h4>
            <ul className="footer-links">
              <li><Link to="/notes">Field Guides &amp; KB</Link></li>
              <li><Link to="/tools">Diagnostic Tools</Link></li>
              <li><Link to="/services">Services &amp; Dispatch</Link></li>
              <li><Link to="/work">Work &amp; Portfolio</Link></li>
              <li><Link to="/topics">Technical Topics</Link></li>
              <li><Link to="/about">About Jawed</Link></li>
            </ul>
          </div>

          {/* Column 3: Featured Diagnostic Utilities */}
          <div className="footer-col">
            <h4>Featured Utilities</h4>
            <ul className="footer-links">
              <li><Link to="/tools/it-troubleshooting-assistant">IT Troubleshooting Assistant</Link></li>
              <li><Link to="/tools/ai-prompt-builder">AI Prompt Builder</Link></li>
              <li><Link to="/tools/career-match-resume-review">Career Match Resume Review</Link></li>
              <li><Link to="/tools/service-desk-note-formatter">Service Desk Note Formatter</Link></li>
              <li><Link to="/tools/personal-finance-snapshot">Personal Finance Snapshot</Link></li>
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
              <li>
                <button
                  type="button"
                  className="cookie-trigger-btn"
                  onClick={onOpenCookieModal}
                  style={{ marginTop: '6px' }}
                >
                  ⚙ Cookie Preferences
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <p>© {currentYear} Jawed Imtiaz. All rights reserved. IT Field Support &amp; Workplace Engineering.</p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Link to="/privacy">AdSense Privacy Notice</Link>
            <span>•</span>
            <Link to="/terms">Terms</Link>
            <span>•</span>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
