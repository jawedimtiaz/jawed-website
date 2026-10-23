import React, { useState } from 'react';

export type WiringStandard = 'T568B' | 'T568A' | 'both';

export const PinoutDiagram: React.FC<{ initialStandard?: WiringStandard }> = ({ initialStandard = 'both' }) => {
  const [standard, setStandard] = useState<WiringStandard>(initialStandard);

  const t568aWires = [
    { pin: 1, name: 'White / Green', color: '#34d399', stripe: true, pair: 'Pair 3', signal: 'TxData+' },
    { pin: 2, name: 'Solid Green', color: '#10b981', stripe: false, pair: 'Pair 3', signal: 'TxData-' },
    { pin: 3, name: 'White / Orange', color: '#fb923c', stripe: true, pair: 'Pair 2', signal: 'RxData+' },
    { pin: 4, name: 'Solid Blue', color: '#38bdf8', stripe: false, pair: 'Pair 1', signal: 'Bi-Dir' },
    { pin: 5, name: 'White / Blue', color: '#7dd3fc', stripe: true, pair: 'Pair 1', signal: 'Bi-Dir' },
    { pin: 6, name: 'Solid Orange', color: '#f97316', stripe: false, pair: 'Pair 2', signal: 'RxData-' },
    { pin: 7, name: 'White / Brown', color: '#a16207', stripe: true, pair: 'Pair 4', signal: 'Bi-Dir' },
    { pin: 8, name: 'Solid Brown', color: '#854d0e', stripe: false, pair: 'Pair 4', signal: 'Bi-Dir' },
  ];

  const t568bWires = [
    { pin: 1, name: 'White / Orange', color: '#fb923c', stripe: true, pair: 'Pair 2', signal: 'TxData+' },
    { pin: 2, name: 'Solid Orange', color: '#f97316', stripe: false, pair: 'Pair 2', signal: 'TxData-' },
    { pin: 3, name: 'White / Green', color: '#34d399', stripe: true, pair: 'Pair 3', signal: 'RxData+' },
    { pin: 4, name: 'Solid Blue', color: '#38bdf8', stripe: false, pair: 'Pair 1', signal: 'Bi-Dir' },
    { pin: 5, name: 'White / Blue', color: '#7dd3fc', stripe: true, pair: 'Pair 1', signal: 'Bi-Dir' },
    { pin: 6, name: 'Solid Green', color: '#10b981', stripe: false, pair: 'Pair 3', signal: 'RxData-' },
    { pin: 7, name: 'White / Brown', color: '#a16207', stripe: true, pair: 'Pair 4', signal: 'Bi-Dir' },
    { pin: 8, name: 'Solid Brown', color: '#854d0e', stripe: false, pair: 'Pair 4', signal: 'Bi-Dir' },
  ];

  const renderConnector = (title: string, wires: typeof t568aWires, badgeColor: string) => (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: '12px',
      padding: '20px',
      flex: 1,
      minWidth: '280px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
        <strong style={{ fontSize: '1.05rem', color: 'var(--text-heading)' }}>{title} Standard</strong>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: badgeColor, color: '#0f172a' }}>
          RJ45 8P8C
        </span>
      </div>

      <div style={{
        background: 'var(--bg-darker)',
        border: '1px solid var(--line)',
        borderRadius: '8px',
        padding: '8px 12px',
        marginBottom: '14px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--muted)',
        fontFamily: 'monospace'
      }}>
        Clip Facing DOWN • Pins 1 - 8 (Left to Right)
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {wires.map(w => (
          <div key={w.pin} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 10px',
            borderRadius: '6px',
            background: 'var(--bg-darker)',
            border: '1px solid var(--line)'
          }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-heading)'
            }}>
              {w.pin}
            </span>

            <div style={{
              width: '40px',
              height: '14px',
              borderRadius: '3px',
              background: w.stripe
                ? `repeating-linear-gradient(45deg, ${w.color}, ${w.color} 6px, #ffffff 6px, #ffffff 12px)`
                : w.color,
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              flexShrink: 0
            }} />

            <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>
                {w.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                {w.pair} ({w.signal})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ margin: '28px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-heading)' }}>
          🔌 RJ45 Color-Coded Wire Pinout Schematics
        </h3>
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-darker)', padding: '4px', borderRadius: '8px', border: '1px solid var(--line)' }}>
          <button
            onClick={() => setStandard('both')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: standard === 'both' ? 'var(--accent)' : 'transparent',
              color: standard === 'both' ? '#0f172a' : 'var(--muted-light)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Side-by-Side
          </button>
          <button
            onClick={() => setStandard('T568B')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: standard === 'T568B' ? 'var(--accent)' : 'transparent',
              color: standard === 'T568B' ? '#0f172a' : 'var(--muted-light)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            T568B
          </button>
          <button
            onClick={() => setStandard('T568A')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: standard === 'T568A' ? 'var(--accent)' : 'transparent',
              color: standard === 'T568A' ? '#0f172a' : 'var(--muted-light)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            T568A
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {(standard === 'both' || standard === 'T568B') && (
          renderConnector('T568B (Commercial Standard)', t568bWires, '#fb923c')
        )}
        {(standard === 'both' || standard === 'T568A') && (
          renderConnector('T568A (Government/Legacy Standard)', t568aWires, '#34d399')
        )}
      </div>
    </div>
  );
};
