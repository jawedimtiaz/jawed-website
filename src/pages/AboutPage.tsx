import React from 'react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <main className="container page">
      <p className="eyebrow">About</p>
      <h1>About Me</h1>

      <section className="content-section">
        <p>
          I’m Jawed Imtiaz, an IT professional with experience across technical support, system administration, Service Desk operations and workplace technology.
        </p>
        <p>
          Today, I work as an IT Field Tech focused on supporting users and devices, troubleshooting technical issues, documenting solutions and helping maintain a reliable workplace technology experience.
        </p>
        <p>
          My professional interests include Apple and macOS, device management, IT service management, automation and practical ways of making technical work simpler and more effective.
        </p>
      </section>

      <section className="content-section">
        <h2>My Background</h2>
        <p>
          My early career gave me a broad foundation in technical support, systems, networking and infrastructure. Over time, my focus expanded from traditional infrastructure support into user-facing IT, Service Desk operations and workplace technology.
        </p>
        <p>
          This experience has given me an appreciation for both sides of IT — understanding how technology works while also understanding the people who depend on it.
        </p>
      </section>

      <section className="content-section">
        <h2>Education</h2>
        <div className="card">
          <h3>Bachelor of Science</h3>
          <p>University of Calcutta</p>
        </div>
      </section>

      <section className="content-section">
        <h2>Career Journey</h2>
        <p>
          My career has moved through technical support, system administration and wider support responsibilities into user-facing Service Desk and workplace technology work. That progression shapes how I approach a support request: understand what the person needs to complete, determine whether the symptom follows a user, device or service, gather evidence before changing settings, and leave a record another technician can continue from.
        </p>
        <p>
          Today I work as an IT Field Tech with Milestone Technologies in support of the Uber environment. This page describes my professional background at a high level; it does not publish employer-confidential procedures, internal systems, user records or identifiable incident details.
        </p>
        <p>
          For public examples of how I document and explain this approach, see the <Link to="/work/projects">selected work examples</Link>, the <Link to="/work/skills">skills-to-practice mapping</Link>, and the <Link to="/notes/it-service-desk-troubleshooting-workflow">IT service desk troubleshooting workflow</Link>.
        </p>
      </section>

      <section className="content-section">
        <h2>Professional Interests</h2>
        <div className="card-grid">
          <article className="card">
            <h3>IT Support &amp; Service Desk</h3>
            <p>User support, troubleshooting, incident and request workflows, documentation and operational support.</p>
          </article>
          <article className="card">
            <h3>Apple &amp; macOS</h3>
            <p>Apple devices, macOS and the evolving Apple workplace technology ecosystem.</p>
          </article>
          <article className="card">
            <h3>Device Management</h3>
            <p>Device provisioning, management and workplace device operations.</p>
          </article>
          <article className="card">
            <h3>Automation</h3>
            <p>Finding practical ways to reduce repetitive work and improve IT processes.</p>
          </article>
          <article className="card">
            <h3>Documentation</h3>
            <p>Creating useful technical information that makes troubleshooting and learning easier.</p>
          </article>
        </div>
      </section>

      <section className="content-section">
        <h2>Current Learning</h2>
        <div className="card-grid two">
          <article className="card">
            <h3>Jamf</h3>
            <p>Building knowledge of Apple device management and Jamf.</p>
            <span className="badge">In progress</span>
          </article>
          <article className="card">
            <h3>ITIL</h3>
            <p>Developing knowledge of IT service management practices and ITIL.</p>
            <span className="badge">In progress</span>
          </article>
        </div>
      </section>

      <section className="content-section">
        <h2>Personal Interests</h2>
        <p>Outside of work, I enjoy reading, exploring gadgets and technology, and spending time with family.</p>
      </section>

      <section className="content-section">
        <h2>Why I Started Jawed.co.in</h2>
        <p>
          Jawed.co.in started as a personal project during the early part of my IT career. While preparing for technical certifications and searching for useful study material, I began collecting information, resources and references that could help with learning.
        </p>
        <p>
          Over time, that collection grew into a website where I could organize and share useful information with others.
        </p>
        <p>
          The website has changed considerably since then. The current version combines my professional portfolio with technical notes, projects, browser-based tools and practical learning material.
        </p>
      </section>

      <section className="content-section">
        <h2>Explore My Work</h2>
        <p>For my experience, skills, certifications and selected projects, visit the professional section.</p>
        <div className="actions">
          <Link className="button" to="/work">View My Professional Profile →</Link>
          <Link className="button button-secondary" to="/contact">Get in Touch →</Link>
        </div>
      </section>
    </main>
  );
};
