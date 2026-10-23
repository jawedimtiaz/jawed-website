import React from 'react';
import { AlertOctagon, Lightbulb, ShieldCheck, Info } from 'lucide-react';

export type CalloutType = 'warning' | 'tip' | 'spec' | 'info';

export interface CalloutBlockProps {
  type: CalloutType;
  title: string;
  children: React.ReactNode;
}

export const CalloutBlock: React.FC<CalloutBlockProps> = ({ type, title, children }) => {
  const getStyle = () => {
    switch (type) {
      case 'warning':
        return {
          bg: 'rgba(244, 63, 94, 0.08)',
          border: '1.5px solid var(--rose)',
          color: 'var(--rose)',
          icon: <AlertOctagon size={22} style={{ flexShrink: 0 }} />
        };
      case 'tip':
        return {
          bg: 'rgba(56, 189, 248, 0.08)',
          border: '1.5px solid var(--accent)',
          color: 'var(--accent)',
          icon: <Lightbulb size={22} style={{ flexShrink: 0 }} />
        };
      case 'spec':
        return {
          bg: 'rgba(45, 212, 191, 0.08)',
          border: '1.5px solid var(--teal)',
          color: 'var(--teal)',
          icon: <ShieldCheck size={22} style={{ flexShrink: 0 }} />
        };
      case 'info':
      default:
        return {
          bg: 'rgba(129, 140, 248, 0.08)',
          border: '1.5px solid var(--indigo)',
          color: 'var(--indigo)',
          icon: <Info size={22} style={{ flexShrink: 0 }} />
        };
    }
  };

  const style = getStyle();

  return (
    <aside style={{
      background: style.bg,
      borderLeft: style.border,
      borderTop: '1px solid var(--line)',
      borderRight: '1px solid var(--line)',
      borderBottom: '1px solid var(--line)',
      borderRadius: '12px',
      padding: '18px 20px',
      margin: '24px 0',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: style.color, marginBottom: '8px' }}>
        {style.icon}
        <strong style={{ fontSize: '1.025rem', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
          {title}
        </strong>
      </div>
      <div style={{ fontSize: '0.925rem', lineHeight: 1.6, color: 'var(--text)' }}>
        {children}
      </div>
    </aside>
  );
};
