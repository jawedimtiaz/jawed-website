import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const AiPromptBuilder: React.FC = () => {
  const [goal, setGoal] = useState('');
  const [context, setContext] = useState('');
  const [desiredOutput, setDesiredOutput] = useState('');
  const [constraints, setConstraints] = useState('');
  const [example, setExample] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleBuild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    const lines = [`Goal: ${goal.trim()}`];
    if (context.trim()) lines.push(`Context: ${context.trim()}`);
    if (desiredOutput.trim()) lines.push(`Desired Output: ${desiredOutput.trim()}`);
    if (constraints.trim()) lines.push(`Constraints: ${constraints.trim()}`);
    if (example.trim()) lines.push(`Example: ${example.trim()}`);
    lines.push('If anything important is uncertain or missing, state that clearly rather than inventing details.');

    setOutput(lines.join('\n\n'));
    setCopied(false);
    setStatusMsg('Prompt built locally in your browser.');
  };

  const handleClear = () => {
    setGoal('');
    setContext('');
    setDesiredOutput('');
    setConstraints('');
    setExample('');
    setOutput('');
    setCopied(false);
    setStatusMsg('');
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setStatusMsg('Copied to clipboard.');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setStatusMsg('Copy is not available in this browser; select the text manually.');
    }
  };

  return (
    <main id="main-content" className="container narrow page">
      <p className="eyebrow">Tool · AI &amp; Productivity</p>
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/tools/">Tools</Link>
        <span>/</span>
        <span aria-current="page">AI Prompt Builder</span>
      </div>

      <h1>AI Prompt Builder</h1>
      <p className="lead">
        Turn a rough request into a clearer AI prompt using four simple building blocks: goal, context, output and constraints.
      </p>

      <section className="content-section">
        <form className="contact-form" onSubmit={handleBuild}>
          <div className="form-field">
            <label htmlFor="prompt-goal">Goal</label>
            <textarea
              id="prompt-goal"
              rows={3}
              placeholder="What do you want the AI to help you accomplish?"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="prompt-context">Context</label>
            <textarea
              id="prompt-context"
              rows={4}
              placeholder="What information does the AI need to understand the task?"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="prompt-desired-output">Desired Output</label>
            <textarea
              id="prompt-desired-output"
              rows={3}
              placeholder="What should the result look like? For example: bullets, table, email or checklist."
              value={desiredOutput}
              onChange={(e) => setDesiredOutput(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="prompt-constraints">Constraints</label>
            <textarea
              id="prompt-constraints"
              rows={3}
              placeholder="Audience, tone, length, limits, things to avoid, or review requirements."
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="prompt-example">Optional Example</label>
            <textarea
              id="prompt-example"
              rows={3}
              placeholder="Add a short example if you need a particular structure or style."
              value={example}
              onChange={(e) => setExample(e.target.value)}
            />
          </div>

          <div className="actions">
            <button className="button" type="submit">
              Build Prompt
            </button>
            <button className="button button-secondary" type="button" onClick={handleClear}>
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="content-section" aria-live="polite">
        <h2>Generated prompt</h2>
        <pre className="tool-output">{output || 'Your prompt will appear here.'}</pre>

        {output && (
          <button className="button" type="button" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Prompt'}
          </button>
        )}
        {statusMsg && (
          <p className="form-note" style={{ marginTop: '8px' }}>
            {statusMsg}
          </p>
        )}
      </section>
    </main>
  );
};
