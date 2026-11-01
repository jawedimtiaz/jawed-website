import React, { useState, useEffect, useRef } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, RotateCw } from 'lucide-react';

export const SyncStatusIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [statusText, setStatusText] = useState('Synced');
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOnline) {
      setSyncState('offline');
      setStatusText('Offline');
      return;
    }

    setSyncState('synced');
    setStatusText('Synced');
    setLastSyncTime(Date.now());

    const handleStorageSaving = () => {
      setSyncState('syncing');
      setStatusText('Syncing...');
    };

    const handleStorageSaved = () => {
      setSyncState('synced');
      setStatusText('Synced');
      setLastSyncTime(Date.now());
    };

    window.addEventListener('diagnostic-storage-saving', handleStorageSaving);
    window.addEventListener('diagnostic-storage-saved', handleStorageSaved);

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('diagnostic-storage-saving', handleStorageSaving);
      window.removeEventListener('diagnostic-storage-saved', handleStorageSaved);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOnline]);

  const handleForceRefresh = () => {
    setSyncState('syncing');
    setStatusText('Syncing...');
    setTimeout(() => {
      setSyncState('synced');
      setStatusText('Synced');
      setLastSyncTime(Date.now());
      window.dispatchEvent(new CustomEvent('diagnostic-storage-saved'));
      setIsDropdownOpen(false);
    }, 800);
  };

  const getBadgeStyle = () => {
    if (syncState === 'offline') {
      return {
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.35)',
        color: '#ef4444',
      };
    }
    if (syncState === 'syncing') {
      return {
        bg: 'rgba(56, 189, 248, 0.15)',
        border: 'rgba(56, 189, 248, 0.4)',
        color: '#38bdf8',
      };
    }
    return {
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
      color: '#10b981',
    };
  };

  const badge = getBadgeStyle();
  const formattedLastSync = new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '20px',
          background: badge.bg,
          border: `1px solid ${badge.border}`,
          color: badge.color,
          fontSize: '0.75rem',
          fontWeight: 700,
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'all 0.15s ease',
        }}
        title="Click to view synchronization details and force refresh cached tools"
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        {syncState === 'offline' && <CloudOff size={13} />}
        {syncState === 'syncing' && <RefreshCw size={13} className="animate-spin" />}
        {syncState === 'synced' && <CheckCircle2 size={13} />}
        <span>{statusText}</span>
      </button>

      {isDropdownOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '240px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 15px rgba(56, 189, 248, 0.15)',
            padding: '14px',
            zIndex: 99999,
            color: 'var(--text)',
            fontSize: '0.8rem',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Cache &amp; Sync Status</span>
            <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: badge.bg, color: badge.color }}>
              {statusText}
            </span>
          </div>

          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '12px' }}>
            <div><strong>Last Synced:</strong> {formattedLastSync}</div>
            <div><strong>Mode:</strong> {isOnline ? 'Online (Server Connected)' : 'Offline (Local Cache Active)'}</div>
          </div>

          <button
            type="button"
            onClick={handleForceRefresh}
            disabled={syncState === 'syncing'}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              background: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: syncState === 'syncing' ? 'not-allowed' : 'pointer',
              opacity: syncState === 'syncing' ? 0.7 : 1,
            }}
          >
            <RotateCw size={13} className={syncState === 'syncing' ? 'animate-spin' : ''} />
            Force Refresh Cache
          </button>
        </div>
      )}
    </div>
  );
};
