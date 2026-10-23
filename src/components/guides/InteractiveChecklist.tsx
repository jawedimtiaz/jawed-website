import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, RotateCcw, CheckCircle2 } from 'lucide-react';

export interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  critical?: boolean;
}

export interface InteractiveChecklistProps {
  id: string;
  title: string;
  subtitle?: string;
  items: ChecklistItem[];
}

export const InteractiveChecklist: React.FC<InteractiveChecklistProps> = ({
  id,
  title,
  subtitle,
  items,
}) => {
  const storageKey = `checklist_state_${id}`;

  const [checkedState, setCheckedState] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checkedState));
    } catch {
      // Ignore storage errors
    }
  }, [checkedState, storageKey]);

  const toggleItem = (itemId: string) => {
    setCheckedState(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleReset = () => {
    setCheckedState({});
  };

  const completedCount = items.filter(item => checkedState[item.id]).length;
  const progressPercent = Math.round((completedCount / items.length) * 100) || 0;
  const isAllDone = completedCount === items.length && items.length > 0;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '24px',
      margin: '28px 0',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--teal)' }}>☑️</span> {title}
          </h3>
          {subtitle && (
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
        <button
          onClick={handleReset}
          style={{
            background: 'var(--bg-darker)',
            border: '1px solid var(--line)',
            color: 'var(--muted-light)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
          title="Reset checklist progress"
        >
          <RotateCcw size={14} /> Reset Progress
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
          <span>{completedCount} of {items.length} tasks completed</span>
          <span style={{ color: isAllDone ? 'var(--emerald)' : 'var(--accent)' }}>{progressPercent}% Complete</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'var(--bg-darker)', borderRadius: '999px', overflow: 'hidden', border: '1px solid var(--line)' }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: isAllDone ? 'linear-gradient(90deg, var(--emerald), var(--teal))' : 'linear-gradient(90deg, var(--accent), var(--teal))',
            transition: 'width 0.25s ease-out'
          }} />
        </div>
      </div>

      {isAllDone && (
        <div style={{
          background: 'rgba(52, 211, 153, 0.12)',
          border: '1px solid var(--emerald)',
          color: 'var(--emerald)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={20} />
          <span>On-Site Procedure Completed! All verification steps passed.</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.map((item, index) => {
          const isChecked = !!checkedState[item.id];
          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: isChecked ? 'rgba(56, 189, 248, 0.06)' : 'var(--bg-darker)',
                border: isChecked ? '1px solid var(--accent)' : '1px solid var(--line)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                userSelect: 'none'
              }}
            >
              <div style={{ marginTop: '2px', color: isChecked ? 'var(--accent)' : 'var(--muted)', flexShrink: 0 }}>
                {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: isChecked ? 'var(--accent-hover)' : 'var(--text-heading)',
                  textDecoration: isChecked ? 'line-through' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>{index + 1}. {item.label}</span>
                  {item.critical && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(244, 63, 94, 0.15)',
                      color: 'var(--rose)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      textDecoration: 'none'
                    }}>
                      CRITICAL
                    </span>
                  )}
                </div>
                {item.description && (
                  <p style={{
                    margin: '4px 0 0',
                    fontSize: '0.85rem',
                    color: isChecked ? 'var(--muted)' : 'var(--muted-light)',
                    lineHeight: 1.45
                  }}>
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
