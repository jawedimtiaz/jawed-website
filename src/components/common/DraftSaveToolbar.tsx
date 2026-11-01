import React, { useState } from 'react';
import { Save, RotateCcw, Wifi, WifiOff, CheckCircle2, Clock, Info } from 'lucide-react';

export interface DraftSaveToolbarProps {
  isOnline: boolean;
  hasSavedDraft: boolean;
  isRestored: boolean;
  isDirty: boolean;
  formattedLastSaved: string;
  statusMessage: string;
  saveStatus: 'idle' | 'saving' | 'saved' | 'restored' | 'cleared';
  onSaveNow: () => void;
  onClearDraft: () => void;
  toolName?: string;
}

export const DraftSaveToolbar: React.FC<DraftSaveToolbarProps> = ({
  isOnline,
  hasSavedDraft,
  isRestored,
  isDirty,
  formattedLastSaved,
  statusMessage,
  saveStatus,
  onSaveNow,
  onClearDraft,
  toolName = 'tool',
}) => {
  const [showRestoredNotice, setShowRestoredNotice] = useState<boolean>(isRestored);
  const [justSavedManual, setJustSavedManual] = useState<boolean>(false);

  const handleManualSave = () => {
    onSaveNow();
    setJustSavedManual(true);
    setTimeout(() => {
      setJustSavedManual(false);
    }, 2000);
  };

  const handleReset = () => {
    if (isDirty || hasSavedDraft) {
      const confirmReset = window.confirm(
        `Reset ${toolName} to default template and remove your saved draft from localStorage?`
      );
      if (!confirmReset) return;
    }
    onClearDraft();
    setShowRestoredNotice(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
      {/* Restored notice banner */}
      {showRestoredNotice && hasSavedDraft && (
        <div
          data-testid="draft-restored-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            fontSize: '0.8rem',
            color: 'var(--text-heading, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={15} color="var(--accent, #38bdf8)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Restored your unsaved draft</strong>
              {formattedLastSaved ? ` from ${formattedLastSaved}` : ''}. Your progress was preserved through local storage.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handleReset}
              className="button button-secondary"
              style={{ padding: '3px 8px', fontSize: '0.72rem', height: 'auto', lineHeight: 'normal' }}
              title="Discard draft and revert to default template"
            >
              Reset to Template
            </button>
            <button
              type="button"
              onClick={() => setShowRestoredNotice(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted, #94a3b8)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                padding: '2px 6px',
              }}
              title="Dismiss notice"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Draft Bar */}
      <div
        data-testid="draft-save-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
          padding: '8px 12px',
          borderRadius: '8px',
          background: isOnline ? 'var(--bg-darker, rgba(15, 23, 42, 0.6))' : 'rgba(245, 158, 11, 0.12)',
          border: isOnline ? '1px solid var(--line, rgba(255, 255, 255, 0.08))' : '1px solid rgba(245, 158, 11, 0.35)',
          fontSize: '0.78rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Connection status badge */}
          {isOnline ? (
            <span
              data-testid="online-status-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: '#34d399',
                fontWeight: 600,
                fontSize: '0.74rem',
              }}
              title="Online — draft is safely preserved in localStorage"
            >
              <Wifi size={13} />
              <span>Online</span>
            </span>
          ) : (
            <span
              data-testid="offline-status-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: '#fbbf24',
                fontWeight: 700,
                fontSize: '0.74rem',
                background: 'rgba(245, 158, 11, 0.18)',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
              title="Connection dropped — all typing is preserved directly in your browser's localStorage"
            >
              <WifiOff size={13} />
              <span>Offline (Saved to Storage)</span>
            </span>
          )}

          {/* 5-second periodic auto-save indicator chip */}
          <span
            data-testid="periodic-autosave-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '1px 7px',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontWeight: 600,
              background: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}
            title="Continuous auto-save every 5 seconds preserves inputs to browser localStorage"
          >
            <Clock size={10} />
            <span>5s Auto-Save</span>
          </span>

          {/* Draft status message */}
          <span
            data-testid="draft-status-message"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--muted, #94a3b8)',
            }}
          >
            {saveStatus === 'saved' || hasSavedDraft ? (
              <CheckCircle2 size={13} color="#34d399" />
            ) : (
              <Clock size={13} />
            )}
            <span>
              {statusMessage ||
                (formattedLastSaved ? `Last saved: ${formattedLastSaved}` : 'Auto-save active (ready)')}
            </span>
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            data-testid="save-draft-btn"
            onClick={handleManualSave}
            className="button button-secondary"
            style={{
              padding: '4px 10px',
              fontSize: '0.74rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              height: 'auto',
              lineHeight: 'normal',
              color: justSavedManual ? '#34d399' : undefined,
              borderColor: justSavedManual ? 'rgba(52, 211, 153, 0.4)' : undefined,
            }}
            title="Manually save current draft to browser localStorage"
          >
            <Save size={12} />
            <span>{justSavedManual ? 'Saved!' : 'Save Draft'}</span>
          </button>

          {(hasSavedDraft || isDirty) && (
            <button
              type="button"
              data-testid="clear-draft-btn"
              onClick={handleReset}
              className="button button-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                height: 'auto',
                lineHeight: 'normal',
                color: 'var(--muted, #94a3b8)',
              }}
              title="Clear saved draft from localStorage and restore default template"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
