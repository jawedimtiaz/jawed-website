import React from 'react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  return (
    <main>
      <section className="hero container">
        <p className="eyebrow">IT Support · Workplace Technology · Practical Tools</p>
        <h1>IT Field Tech focused on support, workplace technology and practical problem-solving.</h1>
        <p className="lead">
          I’m Jawed Imtiaz, an IT professional focused on user support, Service Desk operations, workplace technology, Apple and macOS, device management and practical IT problem-solving. I also build useful browser-based tools and share what I learn about AI, productivity and digital work.
        </p>
        <div className="actions">
          <Link className="button" to="/work">View My Professional Profile →</Link>
          <Link className="button button-secondary" to="/tools">Explore My Tools →</Link>
          <Link className="button button-secondary" to="/contact">Contact Me →</Link>
        </div>
      </section>

      <section className="container page-section">
        <p className="eyebrow">Work evidence</p>
        <h2>How I apply these skills</h2>
        <p>Selected examples show how I approach troubleshooting, device support and technical documentation in practical work.</p>
        <div className="card-grid">
          <article className="card">
            <p className="eyebrow">Troubleshooting</p>
            <h3>First-response problem solving</h3>
            <p>Scope the impact, gather evidence, isolate likely causes, test the smallest appropriate change and validate the result.</p>
            <Link to="/work/projects">View the work evidence →</Link>
          </article>
          <article className="card">
            <p className="eyebrow">Device lifecycle</p>
            <h3>Provisioning &amp; handoff</h3>
            <p>A repeatable approach to preparing, validating and handing over workplace devices with clear support documentation.</p>
            <Link to="/notes/device-provisioning-handoff-checklist">Read the checklist →</Link>
          </article>
          <article className="card">
            <p className="eyebrow">Documentation</p>
            <h3>Clear technical handoffs</h3>
            <p>Capture symptoms, evidence, actions, results and next steps so another technician can continue the work efficiently.</p>
            <Link to="/notes/service-desk-ticket-documentation">Read the documentation note →</Link>
          </article>
        </div>
      </section>

      <section className="container page-section">
        <p className="eyebrow">Career</p>
        <h2>My Career</h2>
        <p>My professional journey has taken me through technical support, system administration, technical support management and IT workplace support.</p>
        <div className="timeline">
          <article className="timeline-item">
            <h3>IT Field Tech</h3>
            <p className="meta">Milestone Technologies, Inc. — Uber</p>
          </article>
          <article className="timeline-item">
            <h3>Technical Support Manager</h3>
            <p className="meta">Currents Technology</p>
          </article>
          <article className="timeline-item">
            <h3>System Executive</h3>
            <p className="meta">ICore</p>
          </article>
          <article className="timeline-item">
            <h3>System Administrator</h3>
            <p className="meta">Khadims</p>
          </article>
          <article className="timeline-item">
            <h3>Technical Support Executive</h3>
            <p className="meta">Altos</p>
          </article>
        </div>
        <p style={{ marginTop: '16px' }}>
          <Link className="button button-secondary" to="/work/experience">View My Experience →</Link>
        </p>
      </section>

      <section className="container page-section">
        <p className="eyebrow">Current learning</p>
        <h2>What I’m Learning</h2>
        <div className="card-grid two">
          <article className="card">
            <h3>Jamf</h3>
            <p>Building my knowledge of Apple device management and Jamf.</p>
            <span className="badge">In progress</span>
          </article>
          <article className="card">
            <h3>ITIL</h3>
            <p>Developing my understanding of IT service management practices and ITIL.</p>
            <span className="badge">In progress</span>
          </article>
        </div>
      </section>

      <section className="container page-section">
        <p className="eyebrow">Highlights</p>
        <h2>A Few Highlights</h2>
        <div className="stats-grid">
          <div className="stat">
            <strong>User Satisfaction</strong>
            <span>Consistently positive user feedback</span>
          </div>
          <div className="stat">
            <strong>People’s Choice Award</strong>
            <span>Uber Vizag COE recognition</span>
          </div>
          <div className="stat">
            <strong>Employee of the Quarter</strong>
            <span>Recognition for performance and contribution</span>
          </div>
          <div className="stat">
            <strong>Tech Support Guru Award</strong>
            <span>People’s Choice recognition for technical support</span>
          </div>
          <div className="stat">
            <strong>Jugaad Genius Award</strong>
            <span>People’s Choice recognition for practical problem-solving</span>
          </div>
          <div className="stat">
            <strong>The Solar Power Award</strong>
            <span>“Always charged up, even on Mondays”</span>
          </div>
        </div>
      </section>

      <section className="container page-section">
        <p className="eyebrow">Find your path</p>
        <h2>What are you looking for?</h2>
        <div className="card-grid">
          <article className="card">
            <h3>“Who is Jawed?”</h3>
            <p>See my background, career journey and professional profile.</p>
            <Link to="/about">About me →</Link>
          </article>
          <article className="card">
            <h3>“I want to learn.”</h3>
            <p>Browse practical notes, topics and resources across technology, AI and digital work.</p>
            <Link to="/notes">Browse Notes →</Link>
          </article>
          <article className="card">
            <h3>“I need a tool.”</h3>
            <p>Use practical browser-based utilities for career, IT and planning tasks.</p>
            <Link to="/tools">Browse Tools →</Link>
          </article>
          <article className="card">
            <h3>“I want to ask.”</h3>
            <p>Use Jawed AI to find relevant content across the site through a conversation.</p>
            <Link to="/ai">Open Jawed AI →</Link>
          </article>
        </div>
      </section>
    </main>
  );
};
