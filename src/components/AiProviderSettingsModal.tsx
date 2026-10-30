import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, AlertCircle, Loader2, X, Settings, ShieldCheck } from 'lucide-react';

export interface AiProviderConfig {
  provider: 'gemini' | 'ollama';
  ollamaEndpoint: string;
  ollamaModel: string;
}

export const STORAGE_KEY_AI_PROVIDER = 'jawed_ai_provider_config_v1';

export const getStoredAiProviderConfig = (): AiProviderConfig => {
  if (typeof window === 'undefined') {
    return { provider: 'gemini', ollamaEndpoint: 'http://localhost:11434', ollamaModel: 'llama3' };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AI_PROVIDER);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: parsed.provider === 'ollama' ? 'ollama' : 'gemini',
        ollamaEndpoint: parsed.ollamaEndpoint || 'http://localhost:11434',
        ollamaModel: parsed.ollamaModel || 'llama3',
      };
    }
  } catch {
    // ignore
  }
  return { provider: 'gemini', ollamaEndpoint: 'http://localhost:11434', ollamaModel: 'llama3' };
};

interface AiProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiProviderSettingsModal: React.FC<AiProviderSettingsModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<AiProviderConfig>(getStoredAiProviderConfig);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(getStoredAiProviderConfig());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY_AI_PROVIDER, JSON.stringify(config));
      window.dispatchEvent(new CustomEvent('ai-provider-changed', { detail: config }));
    } catch {
      // ignore
    }
    onClose();
  };

  const handleTestOllama = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const endpoint = config.ollamaEndpoint.replace(/\/+$/, '');
      const res = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Ollama server returned status ${res.status}`);
      }

      const data = await res.json();
      const models = Array.isArray(data.models) ? data.models.map((m: any) => m.name).join(', ') : 'Connected';
      setTestResult({
        success: true,
        message: `Successfully connected to Ollama! Available models: ${models}`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection failed: ${err?.message || 'Ensure Ollama is running locally with CORS enabled (OLLAMA_ORIGINS="*").'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="AI Provider Settings">
      <div className="modal-content" style={{ width: 'min(520px, 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '14px', marginBottom: '18px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={20} color="var(--accent)" />
            AI Provider &amp; Local Ollama Settings
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Choose between Google Gemini Cloud AI or connect to a locally running Ollama instance for 100% private, free AI summarization and text processing.
        </p>

        <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-heading)', marginBottom: '8px' }}>
              Select AI Backend Provider
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, provider: 'gemini' }))}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: config.provider === 'gemini' ? '2px solid var(--accent)' : '1px solid var(--line)',
                  background: config.provider === 'gemini' ? 'var(--surface-accent)' : 'var(--bg-darker)',
                  color: config.provider === 'gemini' ? 'var(--text-heading)' : 'var(--text)',
                  fontWeight: 650,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ marginBottom: '2px' }}>☁️ Google Gemini</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 400 }}>Cloud-powered models</span>
              </button>

              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, provider: 'ollama' }))}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: config.provider === 'ollama' ? '2px solid var(--accent)' : '1px solid var(--line)',
                  background: config.provider === 'ollama' ? 'var(--surface-accent)' : 'var(--bg-darker)',
                  color: config.provider === 'ollama' ? 'var(--text-heading)' : 'var(--text)',
                  fontWeight: 650,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ marginBottom: '2px' }}>🖥️ Local Ollama</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 400 }}>Free &amp; 100% private</span>
              </button>
            </div>
          </div>

          {config.provider === 'ollama' && (
            <div style={{ background: 'var(--bg-darker)', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)', display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '5px' }}>
                  Ollama API Endpoint
                </label>
                <input
                  type="text"
                  value={config.ollamaEndpoint}
                  onChange={(e) => setConfig((prev) => ({ ...prev, ollamaEndpoint: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)', font: 'inherit' }}
                  placeholder="http://localhost:11434"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '5px' }}>
                  Model Name (e.g. llama3, mistral, phi3)
                </label>
                <input
                  type="text"
                  value={config.ollamaModel}
                  onChange={(e) => setConfig((prev) => ({ ...prev, ollamaModel: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)', font: 'inherit' }}
                  placeholder="llama3"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                <button
                  type="button"
                  onClick={handleTestOllama}
                  disabled={isTesting}
                  className="button button-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  {isTesting ? <Loader2 size={14} className="animate-spin" /> : 'Test Connection'}
                </button>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Requires OLLAMA_ORIGINS="*"</span>
              </div>

              {testResult && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: testResult.success ? 'var(--emerald)' : '#ef4444',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="button button-secondary" style={{ fontSize: '0.88rem' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="button" style={{ fontSize: '0.88rem' }}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
