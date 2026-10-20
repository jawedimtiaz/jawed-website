import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <p>© {currentYear} Jawed Imtiaz. All rights reserved.</p>
        </div>
        <div className="footer-discovery">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/work">Work</Link>
          <Link to="/notes">Notes</Link>
          <Link to="/tools">Tools</Link>
          <Link to="/ai">Ask AI</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
      </div>
    </footer>
  );
};
