import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export interface DoItem {
  title: string;
  points: string[];
}

export interface DontItem {
  title: string;
  points: string[];
}

export interface DosAndDontsCardProps {
  title?: string;
  dos: DoItem;
  donts: DontItem;
}

export const DosAndDontsCard: React.FC<DosAndDontsCardProps> = ({
  title = "Field Standards Comparison",
  dos,
  donts
}) => {
  return (
    <div className="dos-donts-container" style={{ margin: '24px 0' }}>
      {title && (
        <h3 style={{ fontSize: '1.15rem', color: 'var(--text-heading)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚖️</span> {title}
        </h3>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Recommended / DO Card */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.06)',
          border: '1.5px solid var(--emerald)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--emerald)', borderBottom: '1px solid rgba(16, 185, 129, 0.25)', paddingBottom: '10px' }}>
            <CheckCircle2 size={22} style={{ flexShrink: 0 }} />
            <strong style={{ fontSize: '1.05rem', letterSpacing: '-0.01em' }}>RECOMMENDED (DO): {dos.title}</strong>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text)', fontSize: '0.925rem' }}>
            {dos.points.map((pt, idx) => (
              <li key={idx} style={{ lineHeight: 1.5 }}>
                {pt}
              </li>
            ))}
          </ul>
        </div>

        {/* Avoid / DON'T Card */}
        <div style={{
          background: 'rgba(244, 63, 94, 0.06)',
          border: '1.5px solid var(--rose)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--rose)', borderBottom: '1px solid rgba(244, 63, 94, 0.25)', paddingBottom: '10px' }}>
            <XCircle size={22} style={{ flexShrink: 0 }} />
            <strong style={{ fontSize: '1.05rem', letterSpacing: '-0.01em' }}>AVOID / WARNING (DON'T): {donts.title}</strong>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text)', fontSize: '0.925rem' }}>
            {donts.points.map((pt, idx) => (
              <li key={idx} style={{ lineHeight: 1.5 }}>
                {pt}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
