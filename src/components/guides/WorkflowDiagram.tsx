import React from 'react';
import { Laptop } from 'lucide-react';

export interface WorkflowStage {
  step: number;
  title: string;
  badge?: string;
  description: string;
  checklist: string[];
}

export interface WorkflowDiagramProps {
  title: string;
  subtitle?: string;
  stages: WorkflowStage[];
}

export const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({ title, subtitle, stages }) => {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '24px',
      margin: '28px 0',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Laptop style={{ color: 'var(--accent)' }} size={22} />
          {title}
        </h3>
        {subtitle && (
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {stages.map((st) => (
          <div key={st.step} style={{
            background: 'var(--bg-darker)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--accent-dark)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}>
                  {st.step}
                </span>
                {st.badge && (
                  <span style={{ fontSize: '0.725rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(45, 212, 191, 0.15)', color: 'var(--teal)', border: '1px solid rgba(45, 212, 191, 0.3)' }}>
                    {st.badge}
                  </span>
                )}
              </div>

              <h4 style={{ margin: '0 0 6px', fontSize: '1.025rem', color: 'var(--text-heading)' }}>
                {st.title}
              </h4>
              <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--muted-light)', lineHeight: 1.45 }}>
                {st.description}
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: 1.4 }}>
                {st.checklist.map((item, cIdx) => (
                  <li key={cIdx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
