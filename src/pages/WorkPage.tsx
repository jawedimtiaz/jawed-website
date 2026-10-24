import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShareButton } from '../components/ShareButton';

export const WorkPage: React.FC = () => {
  const location = useLocation();
  const path = location.pathname.replace(/\/$/, '');

  const subview = path.endsWith('/experience')
    ? 'experience'
    : path.endsWith('/skills')
    ? 'skills'
    : path.endsWith('/certifications')
    ? 'certifications'
    : path.endsWith('/projects')
    ? 'projects'
    : 'overview';

  return (
    <main className="container page">
      <p className="eyebrow">Professional</p>
      <nav className="breadcrumbs" aria-label="Breadcrumb" style={{ marginBottom: '16px' }}>
        <Link to="/">Home</Link> &gt; <Link to="/work">Work</Link>
        {subview !== 'overview' && (
          <span> &gt; {subview.charAt(0).toUpperCase() + subview.slice(1)}</span>
        )}
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link
            to="/work"
            className={`button ${subview === 'overview' ? '' : 'button-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.9rem' }}
          >
            Overview
          </Link>
          <Link
            to="/work/experience"
            className={`button ${subview === 'experience' ? '' : 'button-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.9rem' }}
          >
            Experience
          </Link>
          <Link
            to="/work/skills"
            className={`button ${subview === 'skills' ? '' : 'button-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.9rem' }}
          >
            Skills
          </Link>
          <Link
            to="/work/certifications"
            className={`button ${subview === 'certifications' ? '' : 'button-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.9rem' }}
          >
            Certifications
          </Link>
          <Link
            to="/work/projects"
            className={`button ${subview === 'projects' ? '' : 'button-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.9rem' }}
          >
            Projects
          </Link>
        </div>
        <ShareButton
          title="Jawed Imtiaz — Professional Work, Experience & Engineering Credentials"
          text="Enterprise IT career experience at Uber, technical support management, certifications (AZ-900, Jamf, Hardware/Networking), and projects."
          url="https://jawed.co.in/work"
          label="Share Work Profile"
          hashtags={['JawedImtiaz', 'WorkHistory', 'ITFieldTech', 'EnterpriseIT']}
        />
      </div>

      {subview === 'overview' && (
        <>
          <h1>Work &amp; Experience</h1>
          <p className="lead">
            My professional experience spans technical support, system administration, technical support management, Service Desk operations and workplace technology.
          </p>

          <div className="card-grid">
            <article className="card">
              <h2>Experience</h2>
              <p>My professional career and the roles I’ve held across IT support and operations.</p>
              <Link to="/work/experience">View Experience →</Link>
            </article>
            <article className="card">
              <h2>Skills</h2>
              <p>Technical and operational skills I use and continue to develop.</p>
              <Link to="/work/skills">View Skills →</Link>
            </article>
            <article className="card">
              <h2>Certifications</h2>
              <p>Professional certifications, qualifications and current learning.</p>
              <Link to="/work/certifications">View Certifications →</Link>
            </article>
            <article className="card">
              <h2>Projects</h2>
              <p>Selected professional and personal projects.</p>
              <Link to="/work/projects">View Projects →</Link>
            </article>
          </div>

          <section className="content-section">
            <h2>Selected Work Evidence</h2>
            <p>See how practical IT support themes from my experience translate into repeatable, public-safe examples.</p>
            <p><Link to="/work/projects">View selected case studies →</Link></p>
          </section>

          <section className="content-section">
            <h2>Skills in Practice</h2>
            <div className="card-grid">
              <article className="card">
                <h3>Troubleshooting</h3>
                <Link to="/work/projects">See evidence →</Link>
              </article>
              <article className="card">
                <h3>Device Management</h3>
                <Link to="/notes/device-provisioning-handoff-checklist">See note →</Link>
              </article>
              <article className="card">
                <h3>Apple / macOS</h3>
                <Link to="/notes/apple-macos-first-response-checklist">See note →</Link>
              </article>
              <article className="card">
                <h3>Networking</h3>
                <Link to="/notes/networking-layer-by-layer-diagnostic-framework">Read framework →</Link>
              </article>
              <article className="card">
                <h3>Automation</h3>
                <Link to="/notes/small-it-automation-starting-point">Read guide →</Link>
              </article>
            </div>
          </section>
        </>
      )}

      {subview === 'experience' && (
        <>
          <h1>Experience</h1>
          <p className="lead">
            My career has developed across technical support, system administration, technical support management and workplace technology.
          </p>

          <section className="content-section">
            <h2>IT Field Tech</h2>
            <p className="meta">Milestone Technologies, Inc. — Uber</p>
            <p>
              Supporting users and workplace technology through IT Service Desk operations, troubleshooting, device support and day-to-day IT operations.
            </p>
            <h3>Areas of responsibility</h3>
            <ul className="tag-list">
              <li>IT Support</li>
              <li>Service Desk Support</li>
              <li>Troubleshooting</li>
              <li>Workplace Technology</li>
              <li>Apple/macOS Support</li>
              <li>Device Provisioning</li>
              <li>Device Management</li>
              <li>IT Operations</li>
              <li>Asset &amp; Inventory Support</li>
              <li>ServiceNow</li>
              <li>Jira</li>
              <li>Slack</li>
            </ul>

            <h3 style={{ marginTop: '20px' }}>Selected achievements</h3>
            <div className="stats-grid">
              <div className="stat"><strong>User Satisfaction</strong><span>Consistently positive user feedback</span></div>
              <div className="stat"><strong>People’s Choice Award</strong><span>Uber Vizag COE recognition</span></div>
              <div className="stat"><strong>The Solar Power Award</strong><span>“Always charged up, even on Mondays”</span></div>
              <div className="stat"><strong>Jugaad Genius Award</strong><span>People’s Choice recognition for practical problem-solving</span></div>
              <div className="stat"><strong>Tech Support Guru Award</strong><span>People’s Choice recognition for technical support</span></div>
              <div className="stat"><strong>Employee of the Quarter</strong><span>Recognition for performance and contribution</span></div>
            </div>
          </section>

          <section className="content-section">
            <h2>Technical Support Manager</h2>
            <p className="meta">Currents Technology</p>
            <p>Technical support and management experience, with responsibility for supporting technology operations and users.</p>
          </section>

          <section className="content-section">
            <h2>System Executive</h2>
            <p className="meta">ICore</p>
            <p>Experience in systems and technical support within an IT environment.</p>
          </section>

          <section className="content-section">
            <h2>System Administrator</h2>
            <p className="meta">Khadims</p>
            <p>Experience in system administration and technical infrastructure support.</p>
          </section>

          <section className="content-section">
            <h2>Technical Support Executive</h2>
            <p className="meta">Altos</p>
            <p>Early professional experience in technical support and IT operations.</p>
          </section>

          <section className="content-section">
            <h2>How I Approach Support Work</h2>
            <ul>
              <li><strong>Understand impact:</strong> clarify what the user needs to do, what failed and whether the issue affects one user, one device or a wider service.</li>
              <li><strong>Gather evidence:</strong> record the exact symptom, relevant context and results of checks rather than treating an error message as a confirmed root cause.</li>
              <li><strong>Act within scope:</strong> follow approved procedures and escalate when permissions, security-sensitive changes or specialist investigation are needed.</li>
              <li><strong>Validate and hand off:</strong> retest the original task, document what changed and what remains unresolved, and provide a useful next step.</li>
            </ul>
          </section>
        </>
      )}

      {subview === 'skills' && (
        <>
          <h1>Skills</h1>
          <p className="lead">
            My skills span IT support, workplace technology, Apple devices, device management, IT operations, networking and automation.
          </p>

          <div className="card-grid">
            <article className="card">
              <h2>IT Support &amp; Service Desk</h2>
              <ul>
                <li>IT Support &amp; Service Desk Support</li>
                <li>Troubleshooting &amp; User Support</li>
                <li>Incident &amp; Request Handling</li>
                <li>Remote Support &amp; IT Operations</li>
                <li>ITSM Documentation</li>
              </ul>
            </article>

            <article className="card">
              <h2>Apple &amp; Device Management</h2>
              <ul>
                <li>macOS &amp; Apple Devices</li>
                <li>Apple Business Manager</li>
                <li>Jamf Pro / Jamf 100</li>
                <li>Device Provisioning &amp; Handoff</li>
                <li>MDM Configuration Profiles</li>
              </ul>
            </article>

            <article className="card">
              <h2>IT Platforms</h2>
              <ul>
                <li>ServiceNow</li>
                <li>Jira Service Management</li>
                <li>Slack Workplace Operations</li>
              </ul>
            </article>

            <article className="card">
              <h2>Identity &amp; Collaboration</h2>
              <ul>
                <li>Google Workspace Administration</li>
                <li>Okta &amp; OneLogin SSO</li>
                <li>Microsoft 365 &amp; Entra ID</li>
              </ul>
            </article>

            <article className="card">
              <h2>Cloud &amp; Infrastructure</h2>
              <ul>
                <li>Azure (AZ-900 certified)</li>
                <li>AWS Cloud Fundamentals</li>
                <li>Networking (TCP/IP, DNS, DHCP, VPN)</li>
                <li>Cisco Meraki Dashboard</li>
              </ul>
            </article>

            <article className="card">
              <h2>Automation &amp; Scripting</h2>
              <ul>
                <li>PowerShell for Endpoint Admin</li>
                <li>JavaScript &amp; Web Automation</li>
                <li>Process Standard Operating Procedures</li>
              </ul>
            </article>
          </div>
        </>
      )}

      {subview === 'certifications' && (
        <>
          <h1>Certifications &amp; Education</h1>

          <section className="content-section">
            <h2>Completed Certifications &amp; Qualifications</h2>
            <div className="card-grid">
              <article className="card">
                <h3>Microsoft Azure Fundamentals — AZ-900</h3>
                <span className="badge">Completed</span>
              </article>
              <article className="card">
                <h3>Advanced Diploma in Hardware &amp; Networking</h3>
                <span className="badge">Completed</span>
              </article>
            </div>
          </section>

          <section className="content-section">
            <h2>Historical Qualifications</h2>
            <div className="card-grid">
              <article className="card">
                <h3>MCSE — Windows Server 2003</h3>
                <span className="badge">Historical</span>
              </article>
              <article className="card">
                <h3>Apple Certified Support Professional 10.9</h3>
                <span className="badge">Historical</span>
              </article>
              <article className="card">
                <h3>Apple Certified Support Professional 10.11</h3>
                <span className="badge">Historical</span>
              </article>
            </div>
          </section>

          <section className="content-section">
            <h2>Education</h2>
            <div className="card">
              <h3>Bachelor of Science</h3>
              <p>University of Calcutta</p>
            </div>
          </section>

          <section className="content-section">
            <h2>Current Learning</h2>
            <div className="card-grid two">
              <article className="card">
                <h3>Jamf 100</h3>
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
        </>
      )}

      {subview === 'projects' && (
        <>
          <h1>Projects &amp; Work Evidence</h1>
          <p className="lead">
            A selection of professional and personal projects related to technology, learning and practical problem solving.
          </p>

          <section className="content-section">
            <article className="card">
              <h2>Jawed.co.in Rebuild &amp; React Modernization</h2>
              <span className="badge">Active project</span>
              <p>
                Mobile-first professional portfolio and knowledge hub featuring practical technical notes, career tools, and interactive utilities for IT support and productivity.
              </p>
              <h3>Technology</h3>
              <ul className="tag-list">
                <li>React</li>
                <li>TypeScript</li>
                <li>Vite</li>
                <li>Clean Responsive CSS</li>
                <li>Client-side Retrieval</li>
              </ul>
            </article>
          </section>

          <section className="content-section">
            <h2>Selected Work Evidence</h2>
            <div className="card-grid">
              <article className="card">
                <p className="eyebrow">Troubleshooting</p>
                <h3>Turning First Response Into a Repeatable Workflow</h3>
                <p><strong>Context:</strong> IT issues often arrive with incomplete symptoms and limited initial evidence.</p>
                <p><strong>Approach:</strong> Start with the user impact, scope the issue, gather evidence, isolate likely causes, test the smallest appropriate change and validate the result.</p>
                <Link to="/notes/it-service-desk-troubleshooting-workflow">Troubleshooting Workflow →</Link>
              </article>

              <article className="card">
                <p className="eyebrow">Device Lifecycle</p>
                <h3>Making Device Handoffs Easier to Support</h3>
                <p><strong>Context:</strong> Device provisioning is not finished when the device powers on; readiness and handoff details matter too.</p>
                <p><strong>Approach:</strong> Use a repeatable sequence covering preparation, configuration checks, validation, user handoff and support documentation.</p>
                <Link to="/notes/device-provisioning-handoff-checklist">Provisioning &amp; Handoff Checklist →</Link>
              </article>

              <article className="card">
                <p className="eyebrow">Documentation</p>
                <h3>Turning Investigation Notes Into Useful Ticket History</h3>
                <p><strong>Context:</strong> Technical work becomes harder to continue when ticket notes capture actions without enough context.</p>
                <p><strong>Approach:</strong> Record symptom, evidence, actions, result and next step in a concise structure.</p>
                <Link to="/notes/service-desk-ticket-documentation">Ticket Documentation Note →</Link>
              </article>
            </div>
          </section>
        </>
      )}
    </main>
  );
};
