import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Settings,
  ShieldCheck,
  Download,
  Upload,
  Copy,
  Check,
  Plus,
  Trash2,
  BookOpen,
  RotateCcw,
  FileText,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  CustomDictionaryTerm,
  getStoredCustomDictionary,
  saveStoredCustomDictionary,
  addCustomDictionaryTerm,
  removeCustomDictionaryTerm,
  toggleCustomDictionaryTerm,
  resetCustomDictionaryToDefault,
  exportTranscriberConfig,
  downloadTranscriberConfigJson,
  importTranscriberConfig,
  TranscriberConfigExport,
} from '../utils/itAutoCorrector';

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
  initialTab?: 'provider' | 'dictionary' | 'import-export';
}

export const AiProviderSettingsModal: React.FC<AiProviderSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'provider',
}) => {
  const [activeTab, setActiveTab] = useState<'provider' | 'dictionary' | 'import-export'>(initialTab);
  const [config, setConfig] = useState<AiProviderConfig>(getStoredAiProviderConfig);
  const [dictionary, setDictionary] = useState<CustomDictionaryTerm[]>([]);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Dictionary management state
  const [dictSearch, setDictSearch] = useState<string>('');
  const [newPhrase, setNewPhrase] = useState<string>('');
  const [newReplacement, setNewReplacement] = useState<string>('');
  const [newCategory, setNewCategory] = useState<CustomDictionaryTerm['category']>('ai');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Import / Export state
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showPasteDirect, setShowPasteDirect] = useState<boolean>(false);
  const [pastedJson, setPastedJson] = useState<string>('');
  const [mergeOnImport, setMergeOnImport] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(getStoredAiProviderConfig());
      setDictionary(getStoredCustomDictionary());
      setTestResult(null);
      setImportStatus(null);
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleDictionaryChanged = (e: CustomEvent<CustomDictionaryTerm[]>) => {
      if (e.detail) {
        setDictionary(e.detail);
      }
    };
    window.addEventListener('custom-dictionary-changed', handleDictionaryChanged as EventListener);
    return () => {
      window.removeEventListener('custom-dictionary-changed', handleDictionaryChanged as EventListener);
    };
  }, []);

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

  // Add term
  const handleAddTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhrase.trim() || !newReplacement.trim()) return;

    addCustomDictionaryTerm({
      phrase: newPhrase.trim(),
      replacement: newReplacement.trim(),
      category: newCategory,
      enabled: true,
    });
    setDictionary(getStoredCustomDictionary());
    setNewPhrase('');
    setNewReplacement('');
    setShowAddForm(false);
  };

  const handleToggleTerm = (id: string) => {
    toggleCustomDictionaryTerm(id);
    setDictionary(getStoredCustomDictionary());
  };

  const handleDeleteTerm = (id: string) => {
    removeCustomDictionaryTerm(id);
    setDictionary(getStoredCustomDictionary());
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset custom dictionary to standard technical defaults? Any custom added terms will be removed.')) {
      const reset = resetCustomDictionaryToDefault();
      setDictionary(reset);
    }
  };

  // Copy JSON
  const handleCopyJson = async () => {
    try {
      const exportData = exportTranscriberConfig();
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  // Export Download
  const handleExportDownload = () => {
    downloadTranscriberConfigJson();
  };

  // Process File Import
  const processImportString = (jsonText: string) => {
    const res = importTranscriberConfig(jsonText, { mergeDictionary: mergeOnImport });
    setImportStatus({
      success: res.success,
      message: res.message,
    });
    if (res.success && res.data) {
      setConfig(res.data.aiProvider);
      setDictionary(res.data.customDictionary);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processImportString(content);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setImportStatus({
        success: false,
        message: 'Could not read the selected configuration file.',
      });
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processImportString(content);
    };
    reader.readAsText(file);
  };

  const handleApplyPastedJson = () => {
    if (!pastedJson.trim()) return;
    processImportString(pastedJson);
  };

  const filteredDictionary = dictionary.filter(
    (t) =>
      t.phrase.toLowerCase().includes(dictSearch.toLowerCase()) ||
      t.replacement.toLowerCase().includes(dictSearch.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(dictSearch.toLowerCase()))
  );

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="AI Audio Transcriber Settings">
      <div
        className="modal-content"
        style={{
          width: 'min(640px, 95vw)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--line)',
            padding: '16px 20px',
            background: 'var(--card)',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                color: 'var(--text-heading)',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Cpu size={20} color="var(--accent)" />
              Transcriber &amp; Local Ollama Settings
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              Manage local AI connections, custom technical terms, and exportable JSON bundles
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 0,
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--line)',
            background: 'var(--bg-darker)',
            padding: '0 20px',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('provider')}
            style={{
              padding: '12px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'provider' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'provider' ? 'var(--text-heading)' : 'var(--muted)',
              fontWeight: activeTab === 'provider' ? 650 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Cpu size={15} color={activeTab === 'provider' ? 'var(--accent)' : undefined} />
            AI Provider (Ollama)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dictionary')}
            style={{
              padding: '12px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'dictionary' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'dictionary' ? 'var(--text-heading)' : 'var(--muted)',
              fontWeight: activeTab === 'dictionary' ? 650 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <BookOpen size={15} color={activeTab === 'dictionary' ? 'var(--accent)' : undefined} />
            Custom Dictionary ({dictionary.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import-export')}
            style={{
              padding: '12px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'import-export' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'import-export' ? 'var(--text-heading)' : 'var(--muted)',
              fontWeight: activeTab === 'import-export' ? 650 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Download size={15} color={activeTab === 'import-export' ? 'var(--accent)' : undefined} />
            Import / Export JSON
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, maxHeight: '60vh' }}>
          {/* TAB 1: AI Provider & Ollama */}
          {activeTab === 'provider' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <p style={{ fontSize: '0.86rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Select whether transcript summaries and analysis are generated via Google Gemini Cloud AI or a locally running Ollama instance for free, zero-upload privacy.
              </p>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-heading)', marginBottom: '8px' }}>
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
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ marginBottom: '2px' }}>☁️ Google Gemini</div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 400 }}>Cloud-powered models</span>
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
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ marginBottom: '2px' }}>🖥️ Local Ollama</div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 400 }}>Free &amp; 100% private</span>
                  </button>
                </div>
              </div>

              {config.provider === 'ollama' && (
                <div
                  style={{
                    background: 'var(--bg-darker)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                    display: 'grid',
                    gap: '12px',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-heading)', marginBottom: '5px' }}>
                      Ollama API Endpoint
                    </label>
                    <input
                      type="text"
                      value={config.ollamaEndpoint}
                      onChange={(e) => setConfig((prev) => ({ ...prev, ollamaEndpoint: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        font: 'inherit',
                        fontSize: '0.85rem',
                      }}
                      placeholder="http://localhost:11434"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-heading)', marginBottom: '5px' }}>
                      Model Name (e.g. llama3, mistral, phi3, deepseek-r1)
                    </label>
                    <input
                      type="text"
                      value={config.ollamaModel}
                      onChange={(e) => setConfig((prev) => ({ ...prev, ollamaModel: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        font: 'inherit',
                        fontSize: '0.85rem',
                      }}
                      placeholder="llama3"
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                    <button
                      type="button"
                      onClick={handleTestOllama}
                      disabled={isTesting}
                      className="button button-secondary"
                      style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                    >
                      {isTesting ? <Loader2 size={14} className="animate-spin" /> : 'Test Connection'}
                    </button>
                    <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Requires OLLAMA_ORIGINS="*"</span>
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
                      {testResult.success ? <CheckCircle2 size={16} style={{ flexShrink: 0 }} /> : <AlertCircle size={16} style={{ flexShrink: 0 }} />}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Custom Technical Dictionary */}
          {activeTab === 'dictionary' && (
            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--muted)', margin: 0 }}>
                    Define words or phrases spoken during technical audio meetings and their correct capitalization/spelling replacement.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="button"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} /> Add Term
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="button button-secondary"
                    style={{ padding: '6px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Reset to default technical vocabulary"
                  >
                    <RotateCcw size={13} /> Reset
                  </button>
                </div>
              </div>

              {/* Add Term Form */}
              {showAddForm && (
                <form
                  onSubmit={handleAddTerm}
                  style={{
                    background: 'var(--bg-darker)',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--accent)',
                    display: 'grid',
                    gap: '10px',
                  }}
                >
                  <div style={{ fontWeight: 650, fontSize: '0.82rem', color: 'var(--accent)' }}>
                    Add Custom Term Mapping
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--muted)', marginBottom: '3px' }}>
                        Spoken Phrase / Mispronunciation
                      </label>
                      <input
                        type="text"
                        value={newPhrase}
                        onChange={(e) => setNewPhrase(e.target.value)}
                        placeholder="e.g. vllm, deep seek"
                        required
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--muted)', marginBottom: '3px' }}>
                        Correct Replacement
                      </label>
                      <input
                        type="text"
                        value={newReplacement}
                        onChange={(e) => setNewReplacement(e.target.value)}
                        placeholder="e.g. vLLM, DeepSeek"
                        required
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--muted)', marginBottom: '3px' }}>
                        Category
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as any)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.8rem' }}
                      >
                        <option value="ai">AI / ML</option>
                        <option value="programming">Programming</option>
                        <option value="devops">DevOps</option>
                        <option value="cloud">Cloud</option>
                        <option value="database">Database</option>
                        <option value="networking">Networking</option>
                        <option value="general">General</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="button button-secondary"
                      style={{ padding: '5px 12px', fontSize: '0.76rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="button"
                      style={{ padding: '5px 14px', fontSize: '0.76rem' }}
                    >
                      Save Term
                    </button>
                  </div>
                </form>
              )}

              {/* Search Filter */}
              <input
                type="text"
                value={dictSearch}
                onChange={(e) => setDictSearch(e.target.value)}
                placeholder="Search custom technical terms..."
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--bg-darker)',
                  color: 'var(--text)',
                  fontSize: '0.82rem',
                }}
              />

              {/* Terms List */}
              <div
                style={{
                  display: 'grid',
                  gap: '6px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '8px',
                  background: 'var(--bg)',
                }}
              >
                {filteredDictionary.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.84rem' }}>
                    No terms found matching "{dictSearch}".
                  </div>
                ) : (
                  filteredDictionary.map((term) => (
                    <div
                      key={term.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'var(--card)',
                        border: '1px solid var(--line)',
                        opacity: term.enabled ? 1 : 0.6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={term.enabled}
                          onChange={() => handleToggleTerm(term.id)}
                          style={{ accentColor: 'var(--emerald)', cursor: 'pointer' }}
                          title={term.enabled ? 'Disable term' : 'Enable term'}
                        />
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-heading)' }}>
                            "{term.phrase}"
                          </span>
                          <span style={{ margin: '0 6px', color: 'var(--muted)', fontSize: '0.8rem' }}>→</span>
                          <span style={{ fontWeight: 650, fontSize: '0.84rem', color: 'var(--emerald)' }}>
                            {term.replacement}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--bg-darker)',
                            border: '1px solid var(--line)',
                            color: 'var(--muted)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {term.category}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteTerm(term.id)}
                          style={{
                            background: 'transparent',
                            border: 0,
                            color: 'var(--muted)',
                            cursor: 'pointer',
                            padding: '3px',
                          }}
                          title="Delete term"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Import / Export Configuration */}
          {activeTab === 'import-export' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div
                style={{
                  background: 'var(--surface-accent)',
                  border: '1px solid var(--accent)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <Download size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.83rem', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 650, color: 'var(--text-heading)', marginBottom: '2px' }}>
                    Save &amp; Share Configuration Bundle (.json)
                  </div>
                  <span style={{ color: 'var(--muted)' }}>
                    Export your complete Ollama API connection settings and custom technical dictionary into a single portable JSON file. Import it anytime or share it across team members to standardize audio transcription corrections.
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              {importStatus && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: importStatus.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${importStatus.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: importStatus.success ? 'var(--emerald)' : '#ef4444',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {importStatus.success ? <CheckCircle2 size={16} style={{ flexShrink: 0 }} /> : <AlertCircle size={16} style={{ flexShrink: 0 }} />}
                  <span>{importStatus.message}</span>
                </div>
              )}

              {/* Export Section */}
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 650, fontSize: '0.88rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Download size={16} color="var(--accent)" />
                    Export Current Configuration
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                    {dictionary.length} custom terms • {config.provider === 'ollama' ? `Ollama (${config.ollamaModel})` : 'Gemini Cloud'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={handleExportDownload}
                    className="button"
                    style={{ fontSize: '0.82rem', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> Download Configuration (.json)
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="button button-secondary"
                    style={{ fontSize: '0.82rem', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isCopied ? <Check size={14} color="var(--emerald)" /> : <Copy size={14} />}
                    {isCopied ? 'Copied to Clipboard!' : 'Copy JSON'}
                  </button>
                </div>
              </div>

              {/* Import Section */}
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <div style={{ fontWeight: 650, fontSize: '0.88rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Upload size={16} color="var(--accent)" />
                  Import Configuration File (.json)
                </div>

                {/* Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: isDragging ? '2px dashed var(--accent)' : '2px dashed var(--line)',
                    background: isDragging ? 'var(--surface-accent)' : 'var(--bg-darker)',
                    borderRadius: '8px',
                    padding: '20px 14px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json,application/json"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <Upload size={24} color="var(--accent)" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                    Click to browse or drop configuration JSON file here
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: '4px' }}>
                    Accepts transcriber-config-*.json files
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.78rem' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text)' }}>
                    <input
                      type="checkbox"
                      checked={mergeOnImport}
                      onChange={(e) => setMergeOnImport(e.target.checked)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <span>Merge imported dictionary with existing terms</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowPasteDirect(!showPasteDirect)}
                    style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  >
                    {showPasteDirect ? 'Hide paste area' : 'Or paste JSON directly'}
                    {showPasteDirect ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {/* Direct Paste JSON Box */}
                {showPasteDirect && (
                  <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                    <textarea
                      rows={4}
                      value={pastedJson}
                      onChange={(e) => setPastedJson(e.target.value)}
                      placeholder='Paste JSON here (e.g. {"aiProvider": {"provider": "ollama", ...}, "customDictionary": [...]})'
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--bg-darker)',
                        color: 'var(--text)',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyPastedJson}
                      disabled={!pastedJson.trim()}
                      className="button"
                      style={{ justifySelf: 'flex-end', fontSize: '0.78rem', padding: '6px 14px' }}
                    >
                      Apply Pasted JSON
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--line)',
            padding: '14px 20px',
            background: 'var(--card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--muted)' }}>
            <ShieldCheck size={14} color="var(--emerald)" />
            <span>Settings saved locally in browser storage</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} className="button button-secondary" style={{ fontSize: '0.86rem' }}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} className="button" style={{ fontSize: '0.86rem' }}>
              Save &amp; Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
