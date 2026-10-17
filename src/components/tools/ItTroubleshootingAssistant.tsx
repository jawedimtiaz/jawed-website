import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface FlowNode {
  q: string;
  why: string;
  a: string;
  an: string;
  ak: string;
  kn: string;
  yesNext: string;
  noNext: string;
}

const FLOWS: Record<string, Record<string, FlowNode> | FlowNode> = {
  network: {
    start: {
      q: 'Can the device reach any known website or network resource?',
      why: 'This separates a local connectivity problem from a problem that may begin after basic connectivity.',
      a: 'Yes',
      an: 'Basic connectivity works. Next test name resolution.',
      ak: 'No',
      kn: 'Basic connectivity is not working. Check local connection state before moving to DNS or application tests.',
      yesNext: 'dns',
      noNext: 'end'
    },
    dns: {
      q: 'Can the device resolve a known domain name?',
      why: 'If connectivity works but names cannot be resolved, name resolution becomes the next boundary to investigate.',
      a: 'Yes',
      an: 'Name resolution works. Next test reachability to the target service.',
      ak: 'No',
      kn: 'Name resolution is the current boundary. Review DNS configuration/status using your approved support process.',
      yesNext: 'reach',
      noNext: 'end'
    }
  },
  reach: {
    q: 'Can the device reach the target service or endpoint?',
    why: 'This distinguishes reachability from a higher application/service-layer problem.',
    a: 'Yes',
    an: 'Reachability works. Investigate the application or service behavior.',
    ak: 'No',
    kn: 'The issue is at reachability or the path to the service. Check scope and approved network diagnostics.',
    yesNext: 'end',
    noNext: 'end'
  },
  microsoft: {
    start: {
      q: 'Does the sign-in problem occur for the same user in another relevant application or device?',
      why: 'A repeatable problem across contexts points toward the account/identity path; a problem limited to one device or application points elsewhere.',
      a: 'Yes',
      an: 'The issue follows the user across contexts. Review account/identity evidence and approved sign-in diagnostics.',
      ak: 'No',
      kn: 'The issue may be device or application specific. Test the same account in another context before changing the device.',
      yesNext: 'service',
      noNext: 'end'
    }
  },
  service: {
    q: 'Do other users have the same sign-in or service symptom?',
    why: 'Multiple affected users can indicate a shared identity or service issue rather than one local device.',
    a: 'Yes',
    an: 'Multiple users are affected. Check approved service/identity status and escalate if outside first-response scope.',
    ak: 'No',
    kn: 'The issue appears user-specific. Continue with approved account/identity checks.',
    yesNext: 'end',
    noNext: 'end'
  },
  apple: {
    start: {
      q: 'Does the same user or service work normally elsewhere?',
      why: 'A comparison helps determine whether the Mac/device is the likely boundary.',
      a: 'Yes',
      an: 'The comparison points toward the Mac/device. Check basic device state, network, storage and the affected application.',
      ak: 'No',
      kn: 'The issue may follow the user or service. Test scope before making device changes.',
      yesNext: 'appleChange',
      noNext: 'end'
    }
  },
  appleChange: {
    q: 'Was there a recent update, configuration or application change?',
    why: 'A recent change is useful evidence, but it is not proof of root cause.',
    a: 'Yes',
    an: 'Record the change and test whether it is relevant using a supported, reversible check.',
    ak: 'No',
    kn: 'No known change. Continue with basic device/application checks and scope comparisons.',
    yesNext: 'end',
    noNext: 'end'
  },
  windows: {
    start: {
      q: 'Does the same user work normally on another device?',
      why: 'This is a high-value comparison for separating device-specific behavior from account or service behavior.',
      a: 'Yes',
      an: 'The issue points toward the Windows device. Check device state, connectivity and the affected application.',
      ak: 'No',
      kn: 'The issue may follow the user or service. Compare another user or device before changing the Windows device.',
      yesNext: 'windowsChange',
      noNext: 'end'
    }
  },
  windowsChange: {
    q: 'Did the problem begin after a recent update, configuration or application change?',
    why: 'Timing can identify a useful variable to test without assuming causation.',
    a: 'Yes',
    an: 'Record the change and test it with the least disruptive supported step.',
    ak: 'No',
    kn: 'No known change. Continue with scope and basic device/application checks.',
    yesNext: 'end',
    noNext: 'end'
  },
  general: {
    start: {
      q: 'Does the issue follow the same user in another relevant context?',
      why: 'A comparison helps separate a user or service issue from a device-specific issue.',
      a: 'Yes',
      an: 'The issue follows the user across contexts. Compare another user or approved service status before changing the device.',
      ak: 'No',
      kn: 'The issue may be device-specific. Check device state and the affected application using the least disruptive supported steps.',
      yesNext: 'end',
      noNext: 'end'
    }
  }
};

export const ItTroubleshootingAssistant: React.FC = () => {
  const [symptom, setSymptom] = useState('');
  const [category, setCategory] = useState('');
  const [currentNode, setCurrentNode] = useState<FlowNode | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [finalEvidence, setFinalEvidence] = useState('');

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptom.trim() || !category) return;

    const catFlow = FLOWS[category];
    if (catFlow && 'start' in catFlow) {
      setCurrentNode((catFlow as Record<string, FlowNode>).start);
      setIsFinished(false);
      setFinalEvidence('');
    }
  };

  const handleAnswer = (choice: 'yes' | 'no') => {
    if (!currentNode) return;
    const text = choice === 'yes' ? currentNode.an : currentNode.kn;
    const nextKey = choice === 'yes' ? currentNode.yesNext : currentNode.noNext;

    if (nextKey === 'end') {
      setIsFinished(true);
      setFinalEvidence(text);
      return;
    }

    const catFlow = FLOWS[category];
    let nextNode: FlowNode | null = null;
    if (catFlow && typeof catFlow === 'object' && nextKey in catFlow) {
      nextNode = (catFlow as Record<string, FlowNode>)[nextKey];
    } else if (FLOWS[nextKey]) {
      nextNode = FLOWS[nextKey] as FlowNode;
    }

    if (nextNode) {
      setCurrentNode(nextNode);
    } else {
      setIsFinished(true);
      setFinalEvidence(text);
    }
  };

  const handleClear = () => {
    setSymptom('');
    setCategory('');
    setCurrentNode(null);
    setIsFinished(false);
    setFinalEvidence('');
  };

  return (
    <main id="main-content" className="container narrow page">
      <p className="eyebrow">Tool · IT Support</p>
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/tools/">Tools</Link>
        <span>/</span>
        <span aria-current="page">IT Troubleshooting Assistant</span>
      </div>

      <h1>IT Troubleshooting Assistant</h1>
      <p className="lead">
        A guided first-response workflow that helps you scope an IT issue and build a reviewable next-step checklist.
      </p>

      <section className="content-section">
        <div className="card">
          <p>
            <strong>Browser-only.</strong> Your answers stay in this page and are not sent to an AI service or server by this tool. Do not enter passwords, authentication codes, private keys, confidential employee information or restricted company data.
          </p>
        </div>
      </section>

      <section className="content-section">
        <form className="contact-form" onSubmit={handleStart}>
          <div className="form-field">
            <label htmlFor="symptom">What is happening?</label>
            <textarea
              id="symptom"
              rows={4}
              placeholder="Describe the exact symptom or visible error. Avoid confidential information."
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="type">What area is closest?</label>
            <select
              id="type"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Choose one</option>
              <option value="general">General IT issue</option>
              <option value="apple">macOS / Apple device</option>
              <option value="windows">Windows device</option>
              <option value="microsoft">Microsoft sign-in / Microsoft 365</option>
              <option value="network">Network / connectivity</option>
            </select>
          </div>

          <div className="actions">
            <button className="button" type="submit">
              Start Diagnosis Path
            </button>
            <button className="button button-secondary" type="button" onClick={handleClear}>
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="content-section" aria-live="polite">
        {!currentNode && !isFinished && (
          <div>
            <h2>Next diagnostic step</h2>
            <p className="form-note">
              Describe the issue and choose an area above to start a guided decision path.
            </p>
          </div>
        )}

        {currentNode && !isFinished && (
          <div className="card" style={{ background: 'var(--surface)' }}>
            <h2>Next diagnostic step</h2>
            <p>
              <strong>Symptom:</strong> {symptom}
            </p>
            <p>
              <strong>Why this matters:</strong> {currentNode.why}
            </p>
            <h3 style={{ fontSize: '1.2rem', marginTop: '14px' }}>{currentNode.q}</h3>
            <div className="actions">
              <button
                className="button"
                type="button"
                onClick={() => handleAnswer('yes')}
              >
                {currentNode.a}
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => handleAnswer('no')}
              >
                {currentNode.ak}
              </button>
            </div>
          </div>
        )}

        {isFinished && (
          <div className="card" style={{ background: 'var(--surface-accent)' }}>
            <h2>Recommended next action</h2>
            <p>
              <strong>Evidence:</strong> {finalEvidence}
            </p>
            <h3>What to do next:</h3>
            <ol>
              <li>{finalEvidence}</li>
              <li>Apply only the least disruptive supported check that matches the evidence.</li>
              <li>Retest the original task and confirm the expected result with the user.</li>
              <li>Document the symptom, test, result, and current state.</li>
            </ol>
            <p>
              <strong>Escalate when:</strong> the next step requires elevated permissions, specialist access, infrastructure changes, security investigation or knowledge outside your support scope.
            </p>
            <div className="actions" style={{ marginTop: '16px' }}>
              <Link className="button" to="/tools/service-desk-note-formatter/">
                Format Service Desk Note →
              </Link>
              <button className="button button-secondary" type="button" onClick={handleClear}>
                Restart Path
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="content-section">
        <h2>Source Notes</h2>
        <ul>
          <li>
            <Link to="/notes/it-service-desk-troubleshooting-workflow/">
              A Practical Service Desk Troubleshooting Workflow
            </Link>
          </li>
          <li>
            <Link to="/notes/scoping-it-issues-user-device-service/">
              User, Device or Service? A Simple Way to Scope IT Issues
            </Link>
          </li>
          <li>
            <Link to="/notes/apple-macos-first-response-checklist/">
              macOS First-Response Troubleshooting Checklist
            </Link>
          </li>
          <li>
            <Link to="/notes/windows-first-response-troubleshooting-checklist/">
              Windows First-Response Troubleshooting Checklist
            </Link>
          </li>
          <li>
            <Link to="/notes/microsoft-sign-in-troubleshooting-guide/">
              Microsoft Sign-In Troubleshooting: A Practical First-Response Guide
            </Link>
          </li>
          <li>
            <Link to="/notes/network-connectivity-first-response-checklist/">
              Network Connectivity First-Response Troubleshooting Checklist
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
};
