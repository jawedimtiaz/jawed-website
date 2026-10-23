import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ShieldAlert,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Terminal,
  Wifi,
  Lock,
  RotateCcw,
  Check,
  Server,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export type ArchitectureType = 'apple-silicon' | 'intel';

export interface ChecklistState {
  [key: string]: boolean;
}

export const MacOSRecoveryGuide: React.FC = () => {
  const [arch, setArch] = useState<ArchitectureType>('apple-silicon');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedRecoveryTool, setSelectedRecoveryTool] = useState<'timemachine' | 'reinstall' | 'safari' | 'diskutility'>('diskutility');
  const [activeVolumeView, setActiveVolumeView] = useState<'group' | 'system' | 'data'>('group');

  // Pre-requisite checklist state with localStorage persistence
  const [checklist, setChecklist] = useState<ChecklistState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('macos_recovery_checklist');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load checklist from localStorage', e);
      }
    }
    return {
      backup: false,
      signout: false,
      activationLock: false,
      power: false,
      wifi: false
    };
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('macos_recovery_checklist', JSON.stringify(checklist));
      } catch (e) {
        console.error('Failed to save checklist to localStorage', e);
      }
    }
  }, [checklist]);

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const resetChecklist = () => {
    setChecklist({
      backup: false,
      signout: false,
      activationLock: false,
      power: false,
      wifi: false
    });
  };

  const completedChecklistCount = Object.values(checklist).filter(Boolean).length;

  return (
    <div className="macos-recovery-guide-component" style={{ color: 'var(--text)', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      {/* ------------------- ARCHITECTURE SELECTOR TOGGLE ------------------- */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu className="text-accent" size={24} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-heading)', fontWeight: 700 }}>
                Select Mac Hardware Architecture
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--muted)' }}>
              Choose your target Mac endpoint CPU to dynamically update recovery startup screens, key combinations, and Disk Utility protocols.
            </p>
          </div>

          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-darker)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--line)'
          }}>
            <button
              type="button"
              onClick={() => setArch('apple-silicon')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: arch === 'apple-silicon' ? 'var(--accent)' : 'transparent',
                color: arch === 'apple-silicon' ? '#0b1120' : 'var(--text-heading)'
              }}
            >
              <span> Apple Silicon (M1/M2/M3/M4)</span>
            </button>
            <button
              type="button"
              onClick={() => setArch('intel')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: arch === 'intel' ? 'var(--accent)' : 'transparent',
                color: arch === 'intel' ? '#0b1120' : 'var(--text-heading)'
              }}
            >
              <span>💻 Intel Core (T2 &amp; Legacy)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Architecture Summary Banner */}
        <div style={{
          background: arch === 'apple-silicon' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(129, 140, 248, 0.08)',
          borderLeft: `4px solid ${arch === 'apple-silicon' ? 'var(--accent)' : 'var(--indigo)'}`,
          borderRadius: '8px',
          padding: '14px 18px',
          fontSize: '0.9rem',
          lineHeight: 1.6
        }}>
          {arch === 'apple-silicon' ? (
            <div>
              <strong style={{ color: 'var(--accent)' }}> Apple Silicon Recovery Architecture:</strong> Recovery OS is embedded in dedicated System Recovery volumes on internal flash storage. Enter Recovery by <strong>holding down the Power / Touch ID button</strong> on power-up until <em>&ldquo;Loading startup options&rdquo;</em> appears.
            </div>
          ) : (
            <div>
              <strong style={{ color: 'var(--indigo)' }}>💻 Intel Core Recovery Architecture:</strong> Recovery OS boots via firmware key combinations. Hold <strong>Command (⌘) + R</strong> for built-in recovery, or <strong>Option + Command (⌘) + R</strong> to boot directly into Internet Recovery over Wi-Fi/Ethernet.
            </div>
          )}
        </div>
      </div>

      {/* ------------------- INTERACTIVE SCHEMATIC 1: STARTUP SCREEN ------------------- */}
      <div style={{
        background: 'var(--bg-darker)',
        border: '1px solid var(--line)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🖥️</span> Interactive Boot Schematic: {arch === 'apple-silicon' ? 'Apple Silicon Startup Options' : 'Intel Boot Key Sequence'}
          </h4>
          <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)', fontSize: '0.75rem' }}>
            {arch === 'apple-silicon' ? 'Press & Hold Power Button' : 'Command (⌘) + R Hold'}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          alignItems: 'center'
        }}>
          {/* Inline SVG Boot Diagram */}
          <div style={{
            background: '#070b14',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '220px',
            position: 'relative'
          }}>
            {arch === 'apple-silicon' ? (
              <svg width="240" height="150" viewBox="0 0 240 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Mac Screen Frame */}
                <rect x="20" y="10" width="200" height="110" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                <rect x="28" y="18" width="184" height="94" rx="4" fill="#020617" />

                {/* Display Icons */}
                <rect x="55" y="40" width="45" height="45" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                <path d="M72 52L82 62L72 72" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />

                {/* Options Gear Icon */}
                <rect x="140" y="40" width="45" height="45" rx="8" fill="#1e293b" stroke="#34d399" strokeWidth="1.5" />
                <circle cx="162.5" cy="62.5" r="10" stroke="#34d399" strokeWidth="2" fill="none" />

                {/* Status Text */}
                <text x="120" y="100" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  Loading startup options...
                </text>

                {/* Mac Base Stand */}
                <path d="M90 120L150 120L160 138L80 138Z" fill="#1e293b" stroke="#334155" />
                {/* Touch ID / Power Button Pulsing */}
                <circle cx="210" cy="122" r="5" fill="#38bdf8">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
              </svg>
            ) : (
              <svg width="240" height="150" viewBox="0 0 240 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Intel Mac Screen */}
                <rect x="20" y="10" width="200" height="110" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                <rect x="28" y="18" width="184" height="94" rx="4" fill="#020617" />

                {/* Spinning Globe / Apple Logo */}
                <circle cx="120" cy="55" r="18" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" fill="none">
                  <animateTransform attributeName="transform" type="rotate" from="0 120 55" to="360 120 55" dur="4s" repeatCount="indefinite" />
                </circle>

                <text x="120" y="98" fill="#38bdf8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  Command (⌘) + R
                </text>

                {/* Stand */}
                <path d="M90 120L150 120L160 138L80 138Z" fill="#1e293b" stroke="#334155" />
              </svg>
            )}
          </div>

          {/* Key Sequence Explanation */}
          <div>
            <h5 style={{ margin: '0 0 8px', fontSize: '1rem', color: 'var(--text-heading)' }}>
              {arch === 'apple-silicon' ? 'Apple Silicon Recovery Trigger' : 'Intel Recovery Trigger'}
            </h5>
            <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text)' }}>
              {arch === 'apple-silicon' ? (
                <>
                  <li>Shut down Mac completely (`Apple Menu` → `Shut Down`).</li>
                  <li>Press and <strong>hold the Touch ID / Power button</strong> down continuously.</li>
                  <li>Release power button when <em>&ldquo;Loading startup options&rdquo;</em> text appears.</li>
                  <li>Select <strong>Options</strong> (gear icon) and click <strong>Continue</strong>.</li>
                  <li>Authenticate with an Administrator password if prompted.</li>
                </>
              ) : (
                <>
                  <li>Shut down Mac completely.</li>
                  <li>Press the Power button once, then immediately press and hold <strong>Command (⌘) + R</strong>.</li>
                  <li>Release keys when the Apple logo or spinning globe appears.</li>
                  <li>For Internet Recovery over Wi-Fi, hold <strong>Option + Command (⌘) + R</strong> instead.</li>
                  <li>Select your local Wi-Fi network and enter network credentials.</li>
                </>
              )}
            </ol>
          </div>
        </div>
      </div>

      {/* ------------------- INTERACTIVE SCHEMATIC 2: 4-OPTION RECOVERY MENU ------------------- */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛠️</span> Interactive macOS Recovery Utilities Panel
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--muted)' }}>
            Click any recovery tool below to inspect its operational role, CLI commands, and deployment guidance.
          </p>
        </div>

        {/* 4-Option Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          {/* Tool 1: Time Machine */}
          <button
            type="button"
            onClick={() => setSelectedRecoveryTool('timemachine')}
            style={{
              background: selectedRecoveryTool === 'timemachine' ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-darker)',
              border: `1.5px solid ${selectedRecoveryTool === 'timemachine' ? 'var(--accent)' : 'var(--line)'}`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent)', marginBottom: '8px' }}>
              <RotateCcw size={20} />
              <strong style={{ fontSize: '0.925rem', color: 'var(--text-heading)' }}>Restore from Time Machine</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.4 }}>
              Restore OS and files from external drive or NAS backup.
            </p>
          </button>

          {/* Tool 2: Reinstall macOS */}
          <button
            type="button"
            onClick={() => setSelectedRecoveryTool('reinstall')}
            style={{
              background: selectedRecoveryTool === 'reinstall' ? 'rgba(52, 211, 153, 0.12)' : 'var(--bg-darker)',
              border: `1.5px solid ${selectedRecoveryTool === 'reinstall' ? 'var(--emerald)' : 'var(--line)'}`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--emerald)', marginBottom: '8px' }}>
              <RefreshCw size={20} />
              <strong style={{ fontSize: '0.925rem', color: 'var(--text-heading)' }}>Reinstall macOS</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.4 }}>
              Download and reinstall a fresh copy of macOS operating system.
            </p>
          </button>

          {/* Tool 3: Safari / Help Online */}
          <button
            type="button"
            onClick={() => setSelectedRecoveryTool('safari')}
            style={{
              background: selectedRecoveryTool === 'safari' ? 'rgba(129, 140, 248, 0.12)' : 'var(--bg-darker)',
              border: `1.5px solid ${selectedRecoveryTool === 'safari' ? 'var(--indigo)' : 'var(--line)'}`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--indigo)', marginBottom: '8px' }}>
              <HelpCircle size={20} />
              <strong style={{ fontSize: '0.925rem', color: 'var(--text-heading)' }}>Safari / Help Online</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.4 }}>
              Browse Apple Support documentation over active network connection.
            </p>
          </button>

          {/* Tool 4: Disk Utility */}
          <button
            type="button"
            onClick={() => setSelectedRecoveryTool('diskutility')}
            style={{
              background: selectedRecoveryTool === 'diskutility' ? 'rgba(251, 146, 60, 0.12)' : 'var(--bg-darker)',
              border: `1.5px solid ${selectedRecoveryTool === 'diskutility' ? 'var(--orange)' : 'var(--line)'}`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--orange)', marginBottom: '8px' }}>
              <HardDrive size={20} />
              <strong style={{ fontSize: '0.925rem', color: 'var(--text-heading)' }}>Disk Utility</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.4 }}>
              Format internal SSD, manage APFS volume groups, or repair disks.
            </p>
          </button>
        </div>

        {/* Selected Tool Details Card */}
        <div style={{
          background: 'var(--bg-darker)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          {selectedRecoveryTool === 'timemachine' && (
            <div>
              <h5 style={{ margin: '0 0 8px', color: 'var(--accent)', fontSize: '1rem' }}>
                ⏪ Time Machine Restore Guidance
              </h5>
              <p style={{ margin: '0 0 12px', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Restores both operating system binaries, user accounts, and applications from a local APFS/HFS+ Time Machine external drive or network SMB backup share.
              </p>
              <div style={{ fontSize: '0.825rem', color: 'var(--muted-light)', background: 'var(--surface)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <strong>Field Note:</strong> On Apple Silicon, restoring a Time Machine backup from a prior macOS major version requires an initial clean OS install to match system firmware versions before running Migration Assistant.
              </div>
            </div>
          )}

          {selectedRecoveryTool === 'reinstall' && (
            <div>
              <h5 style={{ margin: '0 0 8px', color: 'var(--emerald)', fontSize: '1rem' }}>
                📦 Reinstall macOS Guidance
              </h5>
              <p style={{ margin: '0 0 12px', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Downloads a fresh installer image from Apple CDN and reinstalls macOS over the existing volume (preserving user data) or onto a freshly erased APFS volume.
              </p>
              <div style={{ fontSize: '0.825rem', color: 'var(--muted-light)', background: 'var(--surface)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <strong>Prerequisite:</strong> Requires active Wi-Fi or Ethernet connection. On Intel Macs, Shift + Option + Command + R reinstalls the factory macOS version that came with the Mac.
              </div>
            </div>
          )}

          {selectedRecoveryTool === 'safari' && (
            <div>
              <h5 style={{ margin: '0 0 8px', color: 'var(--indigo)', fontSize: '1rem' }}>
                🌐 Safari / Online Support Guidance
              </h5>
              <p style={{ margin: '0 0 12px', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Launches a restricted Safari browser sandbox with restricted file access. Useful for referencing Apple KB documentation (`support.apple.com/en-in/102655`) or verifying internet connection during field triage.
              </p>
            </div>
          )}

          {selectedRecoveryTool === 'diskutility' && (
            <div>
              <h5 style={{ margin: '0 0 8px', color: 'var(--orange)', fontSize: '1rem' }}>
                💾 Disk Utility APFS Volume Protocol
              </h5>
              <p style={{ margin: '0 0 12px', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Essential tool for wiping internal storage prior to OS reinstallation. Since macOS Catalina, Apple utilizes APFS Volume Groups with read-only Signed System Volumes (SSV) and separate user data volumes.
              </p>
              <div style={{ fontSize: '0.825rem', color: 'var(--muted-light)', background: 'var(--surface)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <strong>Critical Rule:</strong> Always select <strong>Erase Volume Group</strong> (or erase `Macintosh HD`) to format both system and data volumes in a single action!
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------- INTERACTIVE SCHEMATIC 3: DISK UTILITY APFS VOLUME GROUP ------------------- */}
      <div style={{
        background: 'var(--bg-darker)',
        border: '1px solid var(--line)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📂</span> Disk Utility APFS Volume Group Architecture
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--muted)' }}>
            Toggle volume layers below to understand Signed System Volume (SSV) separation vs Encrypted User Data (`Macintosh HD - Data`).
          </p>
        </div>

        {/* Volume Diagram Controls */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveVolumeView('group')}
            className={`button ${activeVolumeView === 'group' ? 'button-primary' : 'button-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.825rem' }}
          >
            Container disk3 (Volume Group)
          </button>
          <button
            type="button"
            onClick={() => setActiveVolumeView('system')}
            className={`button ${activeVolumeView === 'system' ? 'button-primary' : 'button-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.825rem' }}
          >
            Macintosh HD (System Volume - Read Only)
          </button>
          <button
            type="button"
            onClick={() => setActiveVolumeView('data')}
            className={`button ${activeVolumeView === 'data' ? 'button-primary' : 'button-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.825rem' }}
          >
            Macintosh HD - Data (User Data)
          </button>
        </div>

        {/* Visual Disk Utility Diagram Container */}
        <div style={{
          background: '#080d1a',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
          fontFamily: 'monospace'
        }}>
          <div style={{ color: 'var(--teal)', fontWeight: 700, marginBottom: '12px', fontSize: '0.9rem' }}>
            ▼ APPLE SSD AP1024R Media (Internal Physical Media)
          </div>

          <div style={{
            marginLeft: '18px',
            paddingLeft: '14px',
            borderLeft: '2px dashed var(--line)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.875rem' }}>
              ▼ Container disk3 (APFS Container)
            </div>

            {/* Macintosh HD System Volume */}
            <div style={{
              marginLeft: '18px',
              background: activeVolumeView === 'system' || activeVolumeView === 'group' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              border: `1px solid ${activeVolumeView === 'system' || activeVolumeView === 'group' ? 'var(--accent)' : 'var(--line)'}`,
              borderRadius: '8px',
              padding: '12px',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem' }}>
                  🔒 Macintosh HD (System Volume)
                </span>
                <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent)' }}>
                  Read-Only SSV
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '0.775rem', color: 'var(--muted)', fontFamily: 'system-ui, sans-serif' }}>
                Cryptographically signed system binaries (`/System`, `/usr/bin`). Protected by System Integrity Protection (SIP).
              </p>
            </div>

            {/* Macintosh HD - Data User Volume */}
            <div style={{
              marginLeft: '18px',
              background: activeVolumeView === 'data' || activeVolumeView === 'group' ? 'rgba(251, 146, 60, 0.12)' : 'transparent',
              border: `1px solid ${activeVolumeView === 'data' || activeVolumeView === 'group' ? 'var(--orange)' : 'var(--line)'}`,
              borderRadius: '8px',
              padding: '12px',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--orange)', fontWeight: 700, fontSize: '0.85rem' }}>
                  🔓 Macintosh HD - Data (Data Volume)
                </span>
                <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(251, 146, 60, 0.2)', color: 'var(--orange)' }}>
                  FileVault Encrypted
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '0.775rem', color: 'var(--muted)', fontFamily: 'system-ui, sans-serif' }}>
                User profiles (`/Users`), corporate applications (`/Applications`), and local cached configurations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------- INTERACTIVE MULTI-STEP WORKFLOW ------------------- */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-heading)' }}>
              📋 4-Step Operational Erase &amp; Reinstall Protocol
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--muted)' }}>
              Follow these standardized field steps to complete clean OS provisioning.
            </p>
          </div>

          {/* Step Badges */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4].map(stepNum => (
              <button
                key={stepNum}
                type="button"
                onClick={() => setActiveStep(stepNum)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: `1.5px solid ${activeStep === stepNum ? 'var(--accent)' : 'var(--line)'}`,
                  background: activeStep === stepNum ? 'var(--accent)' : 'var(--bg-darker)',
                  color: activeStep === stepNum ? '#0b1120' : 'var(--text-heading)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {stepNum}
              </button>
            ))}
          </div>
        </div>

        {/* Step Content Card */}
        <div style={{
          background: 'var(--bg-darker)',
          border: '1px solid var(--line)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '20px'
        }}>
          {activeStep === 1 && (
            <div>
              <h5 style={{ fontSize: '1.05rem', color: 'var(--accent)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Step 1:</span> Pre-Flight Readiness &amp; Activation Lock Sign-Out
              </h5>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', lineHeight: 1.6 }}>
                <li>
                  <strong>Backup Essential User Data:</strong> Ensure all local files in `~/Documents` and `~/Desktop` are synced to OneDrive, Google Drive, or external Time Machine storage.
                </li>
                <li>
                  <strong>Sign Out of Apple Account (iCloud):</strong> Open `System Settings` → click `[User Name]` → scroll down and click <strong>Sign Out</strong>. Turn off Find My Mac to unbind Activation Lock!
                </li>
                <li>
                  <strong>Deauthorize Music &amp; App Store Accounts:</strong> In Music.app, select `Account` → `Authorizations` → `Deauthorize This Computer`.
                </li>
                <li>
                  <strong>Connect MagSafe / USB-C AC Power:</strong> Never initiate OS installation on battery power.
                </li>
              </ul>
            </div>
          )}

          {activeStep === 2 && (
            <div>
              <h5 style={{ fontSize: '1.05rem', color: 'var(--accent)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Step 2:</span> Booting into macOS Recovery Mode
              </h5>
              <div style={{ fontSize: '0.9rem', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {arch === 'apple-silicon' ? (
                  <div>
                    <p style={{ margin: '0 0 8px' }}>
                      On <strong>Apple Silicon (M1/M2/M3/M4)</strong>:
                    </p>
                    <ol style={{ paddingLeft: '20px', margin: 0 }}>
                      <li>Shut down Mac (`Apple Menu` → `Shut Down`).</li>
                      <li>Press and hold Touch ID / Power button until <em>&ldquo;Loading startup options&rdquo;</em> appears.</li>
                      <li>Select <strong>Options</strong> gear icon and click <strong>Continue</strong>.</li>
                      <li>If prompted, select an admin user account and enter the local password.</li>
                    </ol>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 8px' }}>
                      On <strong>Intel Macs</strong>:
                    </p>
                    <ol style={{ paddingLeft: '20px', margin: 0 }}>
                      <li>Shut down Mac completely.</li>
                      <li>Press Power button and immediately hold <strong>Command (⌘) + R</strong>.</li>
                      <li>For Internet Recovery over network, hold <strong>Option + Command (⌘) + R</strong> instead.</li>
                      <li>If the Mac has an Apple T2 Security Chip, enter the EFI Firmware Password if enabled.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div>
              <h5 style={{ fontSize: '1.05rem', color: 'var(--accent)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Step 3:</span> Disk Utility Erase Protocol (APFS &amp; GUID)
              </h5>
              <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '0.9rem', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>From the macOS Recovery Utilities window, select <strong>Disk Utility</strong> and click <strong>Continue</strong>.</li>
                <li>In Disk Utility toolbar, select `View` → <strong>Show All Devices</strong>.</li>
                <li>Select the internal system volume (typically named `Macintosh HD`).</li>
                <li>Click <strong>Erase</strong> in the toolbar.</li>
                <li>Format: Select <strong>APFS</strong>. Scheme: <strong>GUID Partition Map</strong>.</li>
                <li>Click <strong>Erase Volume Group</strong> (or click Erase if Volume Group button is absent).</li>
                <li>Once format completes, quit Disk Utility (`Command + Q`) to return to Recovery menu.</li>
              </ol>
            </div>
          )}

          {activeStep === 4 && (
            <div>
              <h5 style={{ fontSize: '1.05rem', color: 'var(--accent)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Step 4:</span> Clean macOS Installation &amp; Provisioning
              </h5>
              <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '0.9rem', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Select <strong>Reinstall macOS [Version]</strong> from the recovery menu and click <strong>Continue</strong>.</li>
                <li>Accept software license terms and select the freshly formatted `Macintosh HD` drive.</li>
                <li>Click <strong>Install</strong> to begin installer payload download.</li>
                <li>Keep lid open and power connected during multiple automated reboot cycles.</li>
                <li>Upon completion, Setup Assistant will prompt for initial region, accessibility, and MDM enrollment.</li>
              </ol>
            </div>
          )}
        </div>

        {/* Workflow Navigation Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
            disabled={activeStep === 1}
            className="button button-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '0.875rem',
              opacity: activeStep === 1 ? 0.4 : 1,
              cursor: activeStep === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Previous Step
          </button>

          <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>
            Step {activeStep} of 4
          </span>

          <button
            type="button"
            onClick={() => setActiveStep(prev => Math.min(4, prev + 1))}
            disabled={activeStep === 4}
            className="button button-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '0.875rem',
              opacity: activeStep === 4 ? 0.4 : 1,
              cursor: activeStep === 4 ? 'not-allowed' : 'pointer'
            }}
          >
            Next Step <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* ------------------- INTERACTIVE PRE-REQUISITE CHECKLIST ------------------- */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✅</span> On-Site Technician Pre-Erase Checklist
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
              Track real-time readiness before initiating permanent disk format ({completedChecklistCount} of 5 completed).
            </p>
          </div>

          <button
            type="button"
            onClick={resetChecklist}
            className="button button-secondary"
            style={{ padding: '4px 12px', fontSize: '0.775rem' }}
          >
            Reset Checklist
          </button>
        </div>

        {/* Checklist Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { id: 'backup', label: 'User Data Backup Verified', desc: 'Confirm user files are backed up to cloud or external storage.' },
            { id: 'signout', label: 'Apple Account (iCloud) Signed Out', desc: 'Disables Find My Mac and prevents Activation Lock blocking.' },
            { id: 'activationLock', label: 'Activation Lock & ABM Disowned Check', desc: 'Verify device is disowned in Apple Business Manager if retiring hardware.' },
            { id: 'power', label: 'AC Power Adapter Connected', desc: 'Ensure MagSafe or USB-C charger is supplying active power.' },
            { id: 'wifi', label: 'Known Wi-Fi / Ethernet Network Credentials Ready', desc: 'Required for recovery image download and MDM enrollment.' }
          ].map(item => (
            <label
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                background: 'var(--bg-darker)',
                border: `1px solid ${checklist[item.id] ? 'var(--emerald)' : 'var(--line)'}`,
                borderRadius: '10px',
                padding: '12px 16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <input
                type="checkbox"
                checked={!!checklist[item.id]}
                onChange={() => toggleChecklistItem(item.id)}
                style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: 'var(--emerald)' }}
              />
              <div>
                <strong style={{ fontSize: '0.9rem', color: checklist[item.id] ? 'var(--emerald)' : 'var(--text-heading)' }}>
                  {item.label}
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {item.desc}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ------------------- CRITICAL OPERATIONAL WARNING CALLOUTS ------------------- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {/* Warning 1: Activation Lock */}
        <div style={{
          background: 'rgba(244, 63, 94, 0.08)',
          borderLeft: '4px solid var(--rose)',
          borderTop: '1px solid var(--line)',
          borderRight: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          borderRadius: '12px',
          padding: '18px 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--rose)', marginBottom: '8px' }}>
            <ShieldAlert size={20} />
            <strong style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
              CRITICAL FIELD WARNING: ACTIVATION LOCK BRICK RISK
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text)' }}>
            Erasing a Mac without signing out of the user&apos;s Apple Account or clearing MDM supervision triggers <strong>Activation Lock</strong> upon restart! The Mac will refuse to proceed through Setup Assistant until the original Apple ID password or MDM Activation Lock Bypass Code (ALBC) is entered.
          </p>
        </div>

        {/* Warning 2: T2 Firmware Password */}
        <div style={{
          background: 'rgba(251, 146, 60, 0.08)',
          borderLeft: '4px solid var(--orange)',
          borderTop: '1px solid var(--line)',
          borderRight: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          borderRadius: '12px',
          padding: '18px 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--orange)', marginBottom: '8px' }}>
            <Lock size={20} />
            <strong style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
              INTEL T2 CHIP EFI FIRMWARE PASSWORD REQUIREMENT
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text)' }}>
            Intel Macs equipped with an Apple T2 Security Chip (2018–2020 models) with a Firmware Password set will display a lock icon on boot when key combinations are pressed. You <strong>must enter the EFI firmware password</strong> before the Mac will allow booting into macOS Recovery or external USB media!
          </p>
        </div>
      </div>
    </div>
  );
};
