import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Download, X, CheckCircle2, ShieldCheck, Database } from 'lucide-react';
import {
  shouldShowBackupAlert,
  getDaysSinceLastBackup,
  downloadBackupJson,
  recordBackupTaken,
  BACKUP_DUE_DAYS,
} from '../db.js';

/**
 * Backup Alert Banner Component
 * Displays an alert at the top of the ledger if no backup has been taken in the last 30 days.
 * Provides a one-click "Download Backup (JSON)" button that downloads all data and resets the timer.
 */
export const BackupBanner = ({ onOpenBackupModal, onBackupDownloaded, forceShow = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [daysSince, setDaysSince] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  const evaluateAlert = useCallback(() => {
    const days = getDaysSinceLastBackup();
    setDaysSince(days);
    if (forceShow) {
      setIsVisible(true);
      return;
    }
    const due = shouldShowBackupAlert(BACKUP_DUE_DAYS);
    setIsVisible(due);
  }, [forceShow]);

  useEffect(() => {
    evaluateAlert();
  }, [evaluateAlert]);

  const handleQuickDownload = async () => {
    try {
      setIsDownloading(true);
      const payload = await downloadBackupJson();
      recordBackupTaken();
      setSuccessNotice(true);
      if (onBackupDownloaded) {
        onBackupDownloaded(payload);
      }
      setTimeout(() => {
        setIsVisible(false);
        setSuccessNotice(false);
      }, 3500);
    } catch (err) {
      console.error('Failed to download quick backup:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible && !successNotice) {
    return null;
  }

  return (
    <aside
      className="mm-backup-alert-banner"
      role="alert"
      aria-live="polite"
      data-testid="mm-backup-alert-banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        padding: '12px 16px',
        marginBottom: '14px',
        borderRadius: '12px',
        border: '1.5px solid rgba(245, 158, 11, 0.55)',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(15, 23, 42, 0.04))',
        boxShadow: '0 4px 16px rgba(245, 158, 11, 0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 320px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: successNotice ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            color: successNotice ? '#10b981' : '#f59e0b',
            flexShrink: 0,
          }}
        >
          {successNotice ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        </span>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '0.92rem', color: 'var(--text-heading)' }}>
              {successNotice
                ? 'Backup Successfully Downloaded & Timer Reset!'
                : daysSince === null
                ? 'Backup Recommended: No backup recorded yet'
                : `Backup Overdue: Last backup was ${daysSince} days ago`}
            </strong>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 7px',
                borderRadius: '999px',
                backgroundColor: successNotice ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: successNotice ? '#10b981' : '#f59e0b',
                fontWeight: 700,
                border: successNotice ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              {successNotice ? 'Protected' : '30-Day Routine'}
            </span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '0.81rem', color: 'var(--muted)', lineHeight: 1.4 }}>
            {successNotice
              ? 'Your IndexedDB ledger, receipt attachments, and accounts were exported as JSON. Your next 30-day reminder will be in 30 days.'
              : 'Your financial data is stored 100% locally in your browser. Download a routine JSON backup to protect against browser cache clearing or disk cleanup.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleQuickDownload}
          disabled={isDownloading}
          className="mm-btn mm-btn-sm mm-btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            fontSize: '0.82rem',
            fontWeight: 700,
          }}
          data-testid="mm-backup-banner-download-btn"
        >
          <Download size={14} />
          <span>{isDownloading ? 'Exporting...' : 'Download Backup (JSON)'}</span>
        </button>

        {onOpenBackupModal && (
          <button
            type="button"
            onClick={onOpenBackupModal}
            className="mm-btn mm-btn-sm mm-btn-secondary"
            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            data-testid="mm-backup-banner-manage-btn"
          >
            <Database size={13} />
            <span>Manage / Restore</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="mm-btn mm-btn-sm mm-btn-ghost"
          style={{ padding: '6px 8px', color: 'var(--muted)' }}
          aria-label="Dismiss backup alert banner"
          title="Dismiss alert"
          data-testid="mm-backup-banner-dismiss-btn"
        >
          <X size={16} />
        </button>
      </div>
    </aside>
  );
};

export default BackupBanner;
