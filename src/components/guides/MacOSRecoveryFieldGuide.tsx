import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Power,
  Command,
  HardDrive,
  ShieldAlert,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Lock,
  Wifi,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  Sliders,
  Terminal,
  Server,
  Layers
} from 'lucide-react';

export type MacArchitecture = 'apple-silicon' | 'intel';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  critical: boolean;
}

const PREFLIGHT_CHECKLIST_DATA: ChecklistItem[] = [
  {
    id: 'act_lock',
    label: 'Disarm / Verify Activation Lock Status',
    description: 'Ensure device is removed from personal iCloud or Activation Lock Bypass Code is escrowed in Jamf / Intune MDM.',
    critical: true
  },
  {
    id: 'fv_key',
    label: 'Escrow FileVault 2 Recovery Key & Admin Passwords',
    description: 'Verify FileVault recovery key is recorded in enterprise key vault and local admin credentials are documented.',
    critical: true
  },
  {
    id: 'backup_data',
    label: 'Execute Final Data Backup or Migration',
    description: 'Perform Time Machine backup or sync user documents/desktop to OneDrive / iCloud / Google Drive.',
    critical: true
  },
  {
    id: 'sign_out',
    label: 'Sign Out of Apple Account & Managed Services',
    description: 'Sign out of iCloud, iMessage, FaceTime, and unbind local directory accounts before erasing.',
    critical: false
  },
  {
    id: 'power_net',
    label: 'Connect AC Power Adapter & Wired Network',
    description: 'Plug Mac into official PD power adapter (minimum 67W/96W) and connect Ethernet or stable 5GHz Wi-Fi.',
    critical: true
  }
];

export const MacOSRecoveryFieldGuide: React.FC = () => {
  // 1. Architecture Toggle State
  const [arch, setArch] = useState<MacArchitecture>('apple-silicon');

  // 2. Guided Workflow Step State (0..3)
  const [currentStep, setCurrentStep] = useState<number>(0);

  // 3. Interactive Checklist State with localStorage persistence
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('macos_recovery_preflight_checklist');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('macos_recovery_preflight_checklist', JSON.stringify(checklist));
    } catch (e) {
      console.error('Failed to save checklist state to localStorage', e);
    }
  }, [checklist]);

  const toggleCheckitem = (id: string) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const resetChecklist = () => {
    setChecklist({});
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const isChecklistComplete = completedCount === PREFLIGHT_CHECKLIST_DATA.length;

  // Workflow steps definition
  const steps = [
    {
      step: 1,
      title: 'Pre-Flight Triage & Security Decoupling',
      badge: 'Step 1 of 4',
      description: 'Prepare the endpoint before wiping to avoid Activation Lock bricks and lost encryption escrow keys.',
      appleSiliconTips: 'Apple Silicon enforces Ownership Keys bound to the Secure Enclave. Ensure the user removes the Mac from "Find My" or trigger MDM Activation Lock Bypass.',
      intelTips: 'On T2 Intel Macs, ensure Startup Security Utility firmware passwords are known, or disarm Secure Boot in Recovery before wiping network interfaces.',
      checklistIds: ['act_lock', 'fv_key', 'backup_data', 'sign_out', 'power_net']
    },
    {
      step: 2,
      title: 'Booting into macOS Recovery Mode',
      badge: 'Step 2 of 4',
      description: 'Execute hardware-specific startup key sequences or touch power button holds to access the Recovery environment.',
      appleSiliconTips: 'Press and HOLD the Touch ID / Power button until "Loading startup options..." appears. Select "Options" gear icon -> Continue.',
      intelTips: 'Hold Command (⌘) + R for local OS Recovery, or Option + Command + R for latest Internet Recovery until the spinning globe appears.',
      keyCombos: arch === 'apple-silicon' ? [
        { label: 'Press & Hold Power Button', desc: 'Hold until "Loading startup options..." appears on screen.' },
        { label: 'Select Options Gear Icon', desc: 'Click Options -> Continue to enter Apple Silicon Recovery OS.' }
      ] : [
        { label: '⌘ + R', desc: 'Reinstalls the latest macOS that was installed on your Mac.' },
        { label: 'Option + ⌘ + R', desc: 'Upgrades to the latest macOS compatible with your Mac via Internet Recovery.' },
        { label: 'Shift + Option + ⌘ + R', desc: 'Reinstalls the macOS that came with your Mac or closest available version.' }
      ]
    },
    {
      step: 3,
      title: 'Disk Utility Erase Protocol & Volume Group Unlinking',
      badge: 'Step 3 of 4',
      description: 'Erase APFS volume groups correctly to prevent orphaned Data volumes or broken APFS container layouts.',
      appleSiliconTips: 'In Recovery Disk Utility, select "Macintosh HD" -> click "Erase Volume Group" (or Erase Mac in menu bar). Format as APFS / GUID Partition Map.',
      intelTips: 'Show All Devices in View menu -> select top-level Apple SSD media -> click Erase -> Name: Macintosh HD, Format: APFS, Scheme: GUID Partition Map.',
      commandSnippet: arch === 'apple-silicon'
        ? '# Terminal alternative in Recovery:\ndiskutil apfs deleteContainer disk2\ndiskutil eraseDisk APFS "Macintosh HD" gpt disk0'
        : '# Terminal alternative for Intel APFS format:\ndiskutil eraseDisk APFS "Macintosh HD" GPT disk0'
    },
    {
      step: 4,
      title: 'Clean OS Reinstallation & Network Recovery',
      badge: 'Step 4 of 4',
      description: 'Reinstall macOS, complete Wi-Fi/Ethernet handshake, and hand off to Setup Assistant for ADE/MDM enrollment.',
      appleSiliconTips: 'Reinstall macOS automatically contacts Apple Activation Servers. Enter local admin credentials or Apple ID if prompted during activation.',
      intelTips: 'Ensure stable power during installer download. If error -2003F or -1008F occurs, switch from Wi-Fi to a wired USB-C Ethernet adapter.',
      postInstall: 'Upon reaching Setup Assistant, connect to Wi-Fi to trigger Automated Device Enrollment (Remote Management screen).'
    }
  ];

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-[#0b1120] p-4 sm:p-6 md:p-8 text-slate-100 shadow-2xl space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1">
            <Server className="w-4 h-4 text-sky-400" /> Enterprise IT Hardware Field Guide
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Erase &amp; Reinstall macOS Protocol
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Interactive recovery guide for Apple Silicon (M1–M4) and Intel Core Mac endpoints.
          </p>
        </div>

        {/* Architecture Selector Toggle */}
        <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 shadow-inner self-start md:self-center">
          <button
            onClick={() => setArch('apple-silicon')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              arch === 'apple-silicon'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Apple Silicon (M-Series)</span>
          </button>
          <button
            onClick={() => setArch('intel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              arch === 'intel'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Command className="w-4 h-4" />
            <span>Intel Core (T2 &amp; Standard)</span>
          </button>
        </div>
      </div>

      {/* Conditional Architecture Alert Banner */}
      <div className={`p-4 rounded-xl border text-sm transition-all duration-300 ${
        arch === 'apple-silicon'
          ? 'bg-sky-950/30 border-sky-800/60 text-sky-200'
          : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
      }`}>
        <div className="flex items-start gap-3">
          {arch === 'apple-silicon' ? (
            <Cpu className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-bold text-white flex items-center gap-2">
              {arch === 'apple-silicon'
                ? 'Apple Silicon Architecture (M1 / M2 / M3 / M4) Detected'
                : 'Intel Core Architecture (T2 Security Chip & Legacy) Selected'}
            </div>
            <p className="text-xs leading-relaxed opacity-90">
              {arch === 'apple-silicon'
                ? 'Apple Silicon uses System Recovery stored on a dedicated APFS container in internal NAND storage. Power button press-and-hold timing is mandatory to access Startup Options.'
                : 'Intel Macs rely on key combinations during initial chime boot. If fitted with Apple T2 Security Chip, firmware passwords or Startup Security Utility settings may block external boot media.'}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Visual Schematic Diagram */}
      <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Hardware Recovery Visual Schematic ({arch === 'apple-silicon' ? 'M-Series' : 'Intel'})</span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            Interactive Diagram
          </span>
        </div>

        {/* Schematic Layout Canvas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Startup Behavior Schematic */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/80 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Power className="w-4 h-4 text-sky-400" />
                Startup Key Trigger
              </span>
              <span className="text-sky-400 text-[11px] font-mono">
                {arch === 'apple-silicon' ? 'Press & Hold Power' : 'Key Combination'}
              </span>
            </div>

            {arch === 'apple-silicon' ? (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-sky-950/60 border border-sky-500/30 text-sky-400 animate-pulse">
                  <Power className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-white">Hold Touch ID / Power Button</div>
                <div className="text-[11px] font-mono text-slate-400">
                  "Continue holding for startup options..."
                </div>
                <div className="flex justify-center items-center gap-2 text-xs font-semibold text-sky-400 pt-1">
                  <span>Macintosh HD</span>
                  <span>→</span>
                  <span className="px-2 py-0.5 rounded bg-sky-900/40 border border-sky-700/50">Options Gear</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-200">⌘ Command</span>
                  <span className="text-slate-500 font-bold">+</span>
                  <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-200">R</span>
                </div>
                <div className="text-center text-[11px] text-slate-400">
                  Hold immediately after boot chime until Apple logo or spinning globe appears.
                </div>
                <div className="flex justify-around text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                  <span>Local Recovery</span>
                  <span>|</span>
                  <span>Option+⌘+R (Internet)</span>
                </div>
              </div>
            )}
          </div>

          {/* Disk Utility Volume Group Schematic */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/80 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-sky-400" />
                APFS Volume Group Layout
              </span>
              <span className="text-emerald-400 text-[11px] font-mono">APFS Container</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="p-2 rounded bg-slate-900 border border-sky-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Macintosh HD</div>
                    <div className="text-[10px] text-slate-400">System Volume (Read-Only APFS)</div>
                  </div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">System</span>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-indigo-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Macintosh HD - Data</div>
                    <div className="text-[10px] text-slate-400">User Data Volume (Encrypted)</div>
                  </div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">Data</span>
              </div>

              <div className="text-center text-[10px] text-amber-400 font-semibold pt-1">
                ⚠️ Erase Volume Group unlinks and wipes both volumes simultaneously.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Step Interactive Workflow */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-sky-400" />
            4-Step Guided Recovery Workflow
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 gap-2">
          {steps.map((s, idx) => (
            <button
              key={s.step}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? 'bg-sky-400 ring-2 ring-sky-400/40 shadow-lg shadow-sky-500/50'
                  : idx < currentStep
                  ? 'bg-sky-800'
                  : 'bg-slate-800'
              }`}
              title={s.title}
            />
          ))}
        </div>

        {/* Active Step Display Card */}
        <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wide">
              {steps[currentStep].badge}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {arch === 'apple-silicon' ? 'Apple Silicon Protocol' : 'Intel Core Protocol'}
            </span>
          </div>

          <div>
            <h4 className="text-xl font-extrabold text-white">
              {steps[currentStep].title}
            </h4>
            <p className="text-sm text-slate-300 mt-1">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Architecture Specific Tips for Step */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-sky-400" />
              <span>Architectural Instructions ({arch === 'apple-silicon' ? 'Apple Silicon' : 'Intel'})</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {arch === 'apple-silicon'
                ? steps[currentStep].appleSiliconTips
                : steps[currentStep].intelTips}
            </p>

            {/* Render Key Combos if available */}
            {steps[currentStep].keyCombos && (
              <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-800">
                {steps[currentStep].keyCombos.map((kc, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-slate-950 text-xs gap-2">
                    <span className="font-mono font-bold text-sky-300 bg-sky-950 px-2 py-0.5 rounded border border-sky-800/60 self-start sm:self-auto">
                      {kc.label}
                    </span>
                    <span className="text-slate-400 text-[11px]">{kc.desc}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Render Terminal Command snippet if available */}
            {steps[currentStep].commandSnippet && (
              <div className="mt-3 p-3 rounded-lg bg-black border border-slate-800 font-mono text-xs text-emerald-400 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 border-b border-slate-800 pb-1">
                  <span className="flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-emerald-400" /> Terminal Protocol
                  </span>
                  <span>macOS Recovery CLI</span>
                </div>
                <pre className="overflow-x-auto pt-1">{steps[currentStep].commandSnippet}</pre>
              </div>
            )}
          </div>

          {/* Step Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                currentStep === 0
                  ? 'opacity-40 border-slate-800 text-slate-500 cursor-not-allowed'
                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Previous Step
            </button>

            <button
              onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
              disabled={currentStep === steps.length - 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentStep === steps.length - 1
                  ? 'opacity-40 bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-sky-500 text-white hover:bg-sky-400 shadow-md shadow-sky-500/20'
              }`}
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Pre-flight Checklist Section */}
      <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-sky-400" />
              Pre-Flight Safety Verification Checklist
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive checks to complete before triggering disk erasure.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
              isChecklistComplete
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-sky-950 text-sky-300 border-sky-800'
            }`}>
              {completedCount} / {PREFLIGHT_CHECKLIST_DATA.length} Passed
            </span>

            <button
              onClick={resetChecklist}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Reset Checklist"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Checklist Item Cards */}
        <div className="space-y-2.5">
          {PREFLIGHT_CHECKLIST_DATA.map(item => {
            const checked = !!checklist[item.id];
            return (
              <label
                key={item.id}
                onClick={() => toggleCheckitem(item.id)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  checked
                    ? 'bg-sky-950/20 border-sky-800/80 text-slate-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-all ${
                  checked
                    ? 'bg-sky-500 border-sky-400 text-white'
                    : 'border-slate-700 bg-slate-950'
                }`}>
                  {checked && <CheckCircle2 className="w-4 h-4" />}
                </div>

                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${checked ? 'line-through text-slate-400' : 'text-white'}`}>
                      {item.label}
                    </span>
                    {item.critical && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800">
                        Mandatory
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Critical Security Warnings Footer */}
      <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/20 text-rose-200 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          Critical Operational Warning: Activation Lock &amp; T2 Passwords
        </div>
        <p className="leading-relaxed opacity-90">
          Erasing an Apple device without first signing out of personal Apple Accounts or escrowing MDM Activation Lock Bypass Codes will render the hardware unusable after reinstallation. On T2 Intel Macs, forgotten firmware passwords require physical proof of purchase at an Apple Authorized Service Provider for board-level unlock.
        </p>
      </div>
    </div>
  );
};

export default MacOSRecoveryFieldGuide;
