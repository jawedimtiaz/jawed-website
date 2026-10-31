import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { FIELD_GUIDES, determineCategory } from '../data/fieldGuidesData';
import { AdUnitPlaceholder } from '../components/AdUnitPlaceholder';
import { SeoHead } from '../components/SeoHead';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { Image } from '../components/Image';
import { calculateReadTime } from '../utils/readTimeHelper';
import { NewsletterSubscribeForm } from '../components/NewsletterSubscribeForm';
import { extractContentFreshness } from '../utils/contentFreshness';

// Reusable Visual Guide Components & Aliases
import {
  InteractiveServerRackElevation,
  ColorCodedRJ45Pinout,
  PowerEdgeProLiantLedMatrix,
  DoAndDontCard,
  CopyableCliBlock,
  CalloutBlock,
  InteractiveChecklist,
  WorkflowDiagram,
  MacOSRecoveryGuide
} from '../components/guides';

export const FieldGuideDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const guide = FIELD_GUIDES.find(g => g.slug === slug);

  if (!guide) {
    return <Navigate to="/guides" replace />;
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const relatedGuides = FIELD_GUIDES.filter(g => g.slug !== guide.slug);
  const freshness = extractContentFreshness(guide);

  // Render guide body with embedded interactive components
  const renderGuideBodyContent = () => {
    switch (guide.slug) {
      case 'server-rack-cable-management-best-practices':
        return (
          <div className="guide-embedded-body">
            {/* 1. Overview */}
            <CalloutBlock type="spec" title="ANSI/TIA-606-D Administration & Labeling Specification">
              All data center patch cabling must be labeled on both ends within 100mm (4 inches) of the connector using durable heat-shrink or self-laminating vinyl labels formatted as: <code>{"[Origin Rack]-[Device]-[Port] ===> [Dest Rack]-[Device]-[Port]"}</code>.
            </CalloutBlock>

            {/* MOUNTED DIRECTLY AT TOP OF GUIDE: 42U Rack Schematic */}
            <div style={{ margin: '28px 0' }}>
              <InteractiveServerRackElevation />
            </div>

            <h2 id="rack-architecture">1. Modern Rack Cabling Architecture</h2>
            <p>
              In enterprise data centers and network closets (IDFs), two primary physical switch-to-patch architectures dominate:
            </p>
            <ul>
              <li><strong>Top-of-Rack (ToR):</strong> A switch is placed within or near the rack it serves, drastically reducing server-to-switch cable run length.</li>
              <li><strong>Structured Patch Panel-to-Switch Interconnect:</strong> Patch panels and switches are arranged for clear 1-to-1 port mapping and physical serviceability.</li>
            </ul>

            <h2 id="bend-radius">2. Cat6A &amp; Fiber Bend Radius Rules</h2>
            <p>
              Exceeding a cable's specified bend radius damages copper pair physical geometry, increasing Near-End Crosstalk (NEXT) and return loss:
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cable Type</th>
                    <th>Minimum Installed Bend Radius</th>
                    <th>Field Verification Requirement</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Cat5e / Cat6 UTP</strong></td>
                    <td>4x Cable Outer Diameter (~1.0 inch)</td>
                    <td>Visual inspection; ensure no 90° severe cable bends.</td>
                  </tr>
                  <tr>
                    <td><strong>Cat6A Shielded (F/UTP)</strong></td>
                    <td>8x Cable Outer Diameter (~2.0 inches)</td>
                    <td>Verify STP drain wire grounding at patch panel.</td>
                  </tr>
                  <tr>
                    <td><strong>OS2 Single-Mode Fiber</strong></td>
                    <td>10x Cable Outer Diameter (~1.5 inches unloaded)</td>
                    <td>Inspect with OTDR / optical power meter.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 id="velcro-vs-zipties">3. Velcro Straps vs Zip-Ties Guidelines</h2>
            {/* REPLACED PLAIN TEXT WITH <DoAndDontCard /> */}
            <DoAndDontCard
              title="Data Center Restraint Standard: Hook-and-Loop Straps vs Zip-Ties"
              dos={{
                title: "Velcro Hook-and-Loop Cable Straps",
                points: [
                  "Use reusable hook-and-loop straps spaced every 200–300mm along vertical rack managers.",
                  "Allows easy additions, moves, and changes (MACs) without cutting tools.",
                  "Prevents jacket pinching and conductor deformation on high-density Cat6A/Cat8 STP runs.",
                  "Distributes cable weight evenly without causing localized alien crosstalk (AXT)."
                ]
              }}
              donts={{
                title: "Plastic Nylon Zip-Ties (Nylon Restraints)",
                points: [
                  "Avoid ratcheting plastic zip-ties on enterprise copper or fiber optic patch bundles.",
                  "Overtightening crushes cable geometry, altering characteristic impedance (100-ohm) and causing NEXT/FCS errors.",
                  "Requires sharp wire cutters near live cables during maintenance, risking accidental copper cuts.",
                  "Produces sharp plastic tail edges that cause technician cuts in dark server racks."
                ]
              }}
            />

            <h2 id="airflow-thermal">4. Airflow &amp; Hot/Cold Aisle Thermal Optimization</h2>
            <CalloutBlock type="tip" title="Field Pro-Tip: Hot/Cold Aisle Thermal Isolation">
              Always install 1U/2U blanking panels in all empty rack slots. Missing blanking panels allow hot exhaust air to re-circulate back into cold aisle server intake fans, raising ambient CPU operating temperatures by up to 8°C!
            </CalloutBlock>
            <ol style={{ lineHeight: 1.8 }}>
              <li><strong>Clear the Hot Aisle Exhaust:</strong> Route power cables (PDUs) and network cabling along vertical side rails or dedicated zero-U vertical managers.</li>
              <li><strong>Separate Power &amp; Data Pathways:</strong> Maintain minimum 12-inch spacing between 120V/208V AC power bundles and Cat6A data patch cords.</li>
              <li><strong>Install Blanking Panels:</strong> Seal unused U space to maintain cold aisle static pressure.</li>
            </ol>

            <h2 id="labeling-standards">5. ANSI/TIA-606-D Labeling Conventions</h2>
            <p>
              Label both ends of each cable in a durable, legible machine-printed format:
            </p>
            <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--line)', padding: '16px', borderRadius: '10px', fontFamily: 'monospace', color: 'var(--emerald)' }}>
              [Origin Rack]-[Origin Panel/Device]-[Port] ===&gt; [Dest Rack]-[Dest Panel/Device]-[Port]<br/>
              Example: RACK01-PP02-P14 ===&gt; RACK03-SW01-P28
            </div>

            <h2 id="rack-checklist">6. Server Rack Dressing Sign-Off Checklist</h2>
            {/* MOUNTED AT BOTTOM FOR FIELD SIGN-OFF */}
            <InteractiveChecklist
              id="server_rack_dressing_checklist"
              title="Server Rack Cable Dressing & Airflow Verification Checklist"
              subtitle="Perform this step-by-step checklist on-site after rack installation or patch panel termination."
              items={[
                {
                  id: 'step_1',
                  label: 'Verify Cord Lengths & Patch Plan',
                  description: 'Confirm patch cord lengths match actual distance to ToR switch without excess slack coils.',
                  critical: true
                },
                {
                  id: 'step_2',
                  label: 'Secure Bundles with Hook-and-Loop Straps',
                  description: 'Bundle cabling in groups of 12 or 24 using Velcro straps without compressing outer PVC jackets.',
                  critical: false
                },
                {
                  id: 'step_3',
                  label: 'Validate Minimum Bend Radius',
                  description: 'Ensure Cat6A cables maintain minimum 4x outer diameter bend radius (no sharp 90° kinks).',
                  critical: true
                },
                {
                  id: 'step_4',
                  label: 'Inspect Cold Aisle Intake & Hot Aisle Exhaust Paths',
                  description: 'Clear vertical zero-U channels so server fan exhausts are completely unobstructed.',
                  critical: true
                },
                {
                  id: 'step_5',
                  label: 'Install 1U/2U Blanking Panels in Unused Slots',
                  description: 'Seal all empty rack units to force cold air through active server chassis intake grills.',
                  critical: false
                },
                {
                  id: 'step_6',
                  label: 'Apply ANSI/TIA-606-D Machine-Printed Labels',
                  description: 'Label both ends of every power cord and patch cord with matching origin/destination identifiers.',
                  critical: true
                }
              ]}
            />
          </div>
        );

      case 'rj45-cabling-t568a-vs-t568b-guide':
        return (
          <div className="guide-embedded-body">
            <CalloutBlock type="warning" title="Field Safety & Wiremap Rules">
              Never mix T568A and T568B terminations on opposite ends of a single straight-through cable link unless deliberately constructing a legacy 10/100BASE-T crossover cable. Mixed terminations swap Tx and Rx pairs and cause physical layer autonegotiation failure on legacy hardware!
            </CalloutBlock>

            {/* MOUNTED NEAR TOP: Color Coded Pinout Diagram */}
            <div style={{ margin: '28px 0' }}>
              <ColorCodedRJ45Pinout initialStandard="both" />
            </div>

            <h2 id="overview">1. Overview of ANSI/TIA-568 Standards</h2>
            <p>
              The <strong>ANSI/TIA-568</strong> commercial building telecommunications cabling standard defines the pin/pair assignments for eight-conductor 100-ohm balanced twisted-pair cabling (Cat5e, Cat6, and Cat6A).
            </p>

            <h2 id="pinout-tables">2. T568A vs T568B Color Code Pinout Tables</h2>
            <p>
              When holding an RJ45 connector with the locking clip facing <strong>downward</strong> (away from you) and gold contacts facing <strong>upward</strong>, Pin 1 is on the far left and Pin 8 is on the far right.
            </p>

            <h2 id="straight-vs-crossover">3. Straight-Through vs Crossover Configurations</h2>
            <ul>
              <li><strong>Straight-Through Cable:</strong> Both ends terminated in T568B (or both in T568A). Connects workstation/server to switch port.</li>
              <li><strong>Crossover Cable:</strong> One end terminated in T568A and opposite end in T568B. Swaps Transmit (1/2) and Receive (3/6) pairs.</li>
              <li><strong>Auto-MDIX:</strong> Modern switch ports auto-detect pinouts, but manual fixed-pinout legacy devices still require proper straight-through cables.</li>
            </ul>

            <h2 id="crimping-mistakes">4. Top 5 Field Crimping Mistakes to Avoid</h2>
            {/* REPLACED PLAIN TEXT WITH <DoAndDontCard /> */}
            <DoAndDontCard
              title="RJ45 Field Crimping & Termination Standards"
              dos={{
                title: "Precision Pass-Through Crimping Method",
                points: [
                  "Maintain pair twists up to within 13mm (0.5 in) of the gold contact blades.",
                  "Use ratcheting crimp tools with built-in flush wire trimming blades.",
                  "Ensure outer PVC cable jacket extends inside plug housing past strain-relief wedge.",
                  "Perform wiremap continuity testing with a certified cable tester before commissioning."
                ]
              }}
              donts={{
                title: "Common Field Termination Errors",
                points: [
                  "Untwisting pairs more than 1/2 inch, which causes severe Near-End Crosstalk (NEXT) degradation.",
                  "Leaving jacket strain relief outside the RJ45 housing, causing conductor fatigue and wire pull-out.",
                  "Swapping Pin 3 (White/Green) and Pin 5 (White/Blue) causing split-pair noise induction.",
                  "Using solid-conductor RJ45 plugs on stranded patch cables (or vice-versa)."
                ]
              }}
            />

            <h2 id="field-verification">5. Cable Tester Readings &amp; Wiremap Fault Diagnosis</h2>
            <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--line)', padding: '16px', borderRadius: '10px', margin: '16px 0' }}>
              <h4 style={{ marginTop: 0, color: 'var(--accent)' }}>Diagnostic Fault Interpretation:</h4>
              <ul style={{ marginBottom: 0 }}>
                <li><strong>Open Circuit (Pin 3 Off):</strong> Pin 3 conductor broken internally or contact prong failed to pierce insulation blade.</li>
                <li><strong>Short Circuit (LEDs 1 &amp; 2 illuminate together):</strong> Conductors contacting due to crushed cable jacket or wire blade bridge.</li>
                <li><strong>Split Pair (Continuity 1-8 correct, but high error rates):</strong> Individual wires from two different twisted pairs terminated onto a pair position (e.g. Orange and Green mixed). Cancels differential noise immunity!</li>
              </ul>
            </div>

            <h2 id="key-takeaways">6. Field Summary &amp; Crimp Sign-Off Checklist</h2>
            {/* MOUNTED AT BOTTOM */}
            <InteractiveChecklist
              id="rj45_crimping_verification_checklist"
              title="RJ45 Cabling & Wiremap Verification Checklist"
              subtitle="Step-by-step physical layer verification protocol for network technicians."
              items={[
                {
                  id: 'crimp_1',
                  label: 'Strip Outer Cable Jacket (Approx 1.5 inches)',
                  description: 'Expose inner twisted pairs without nicking or scoring individual conductor insulation.',
                  critical: true
                },
                {
                  id: 'crimp_2',
                  label: 'Arrange Wire Sequence according to T568B Standard',
                  description: 'Sequence: White/Orange, Orange, White/Green, Blue, White/Blue, Green, White/Brown, Brown.',
                  critical: true
                },
                {
                  id: 'crimp_3',
                  label: 'Trim Wires Flush & Insert Fully into 8P8C Housing',
                  description: 'Verify all 8 copper conductors reach the front tip of the RJ45 plug under gold contacts.',
                  critical: false
                },
                {
                  id: 'crimp_4',
                  label: 'Crimp Firmly with Ratcheting Tool',
                  description: 'Confirm primary strain relief wedge compresses outer jacket and pins pierce insulation.',
                  critical: true
                },
                {
                  id: 'crimp_5',
                  label: 'Run Wiremap & Continuity Test',
                  description: 'Verify 1-to-1 pin continuity and test for short circuits, open pairs, or split pairs.',
                  critical: true
                }
              ]}
            />
          </div>
        );

      case 'diagnosing-network-port-flapping-cli-guide':
        return (
          <div className="guide-embedded-body">
            <CalloutBlock type="tip" title="Field Pro-Tip: Fast Port Flap Diagnosis">
              When encountering rapid <code>{"LINK-UP / LINK-DOWN"}</code> syslog messages, immediately check the physical layer first: replace the patch cable and inspect SFP optical DDM receive levels before altering switch configuration!
            </CalloutBlock>

            <h2 id="link-flapping-causes">1. What Causes Network Port Flapping?</h2>
            <p>
              Port flapping occurs when an interface rapidly transitions between <code>LINK-UP</code> and <code>LINK-DOWN</code> states, causing spanning-tree or routing reconvergence.
            </p>

            <h2 id="cisco-cli-workflow">2. Cisco IOS / IOS-XE Diagnostic CLI Workflow</h2>
            {/* MOUNTED COPYABLE CLI BLOCKS */}
            <CopyableCliBlock
              label="Cisco IOS / IOS-XE Port Flap Triage Sequence"
              promptSymbol="Switch#"
              command="show logging | include LINK-3-UPDOWN|LINEPROTO-5-UPDOWN"
              output={`%LINK-3-UPDOWN: Interface GigabitEthernet1/0/12, changed state to down\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet1/0/12, changed state to down`}
            />
            <CopyableCliBlock
              label="Cisco IOS Inspect Detailed Interface Status"
              promptSymbol="Switch#"
              command="show interface GigabitEthernet1/0/12"
              output={`GigabitEthernet1/0/12 is up, line protocol is up (connected)\n  Hardware is Gigabit Ethernet, address is a453.0e21.8480\n  Full-duplex, 1000Mb/s, link type is auto, media type is 10/100/1000BaseTX`}
            />
            <CopyableCliBlock
              label="Cisco IOS Check Interface CRC & FCS Errors"
              promptSymbol="Switch#"
              command="show interfaces GigabitEthernet1/0/12 counters errors"
              output={`Port      Align-Err  FCS-Err  Xmit-Err  Rcv-Err  UnderSize  OutDiscards\nGi1/0/12          0     4821         0     4821          0            0`}
            />

            <h2 id="aruba-cli-workflow">3. Aruba OS-CX Diagnostic CLI Workflow</h2>
            <CopyableCliBlock
              label="Aruba OS-CX Inspect Port Event Logs"
              promptSymbol="Switch#"
              command="show events category port-mgr | include 1/1/12"
              output={`2026-10-22T14:22:01.120Z port-mgr[1402]: Event|101|LOG_INFO|1/1/12 link status changed to DOWN`}
            />
            <CopyableCliBlock
              label="Aruba OS-CX Inspect Optical Transceiver DDM Levels"
              promptSymbol="Switch#"
              command="show interface 1/1/12 transceiver detail"
              output={`Transceiver Diagnostics :\n  Rx Power : -14.2 dBm [ Normal Range: -18.0 to -3.0 dBm ]\n  Tx Power : -2.1 dBm  [ Normal Range: -9.5 to -1.0 dBm ]`}
            />

            <h2 id="duplex-mismatch">4. Isolating Speed &amp; Duplex Mismatches</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Local Switch Port</th>
                    <th>Remote Device Port</th>
                    <th>Resulting Link Behavior</th>
                    <th>Observed Symptoms</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Auto-Negotiate</td>
                    <td>Auto-Negotiate</td>
                    <td><span style={{ color: 'var(--emerald)', fontWeight: 700 }}>Full-Duplex (Optimal)</span></td>
                    <td>Zero errors, full throughput.</td>
                  </tr>
                  <tr>
                    <td>Hardcoded 100/Full</td>
                    <td>Auto-Negotiate</td>
                    <td><span style={{ color: 'var(--rose)', fontWeight: 700 }}>Duplex Mismatch!</span></td>
                    <td>Late collisions, FCS CRC errors, poor throughput.</td>
                  </tr>
                  <tr>
                    <td>Forced 1000/Full</td>
                    <td>Forced 1000/Full</td>
                    <td><span style={{ color: 'var(--amber)', fontWeight: 700 }}>Non-Standard</span></td>
                    <td>Gigabit requires autonegotiation per 802.3ab standard.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 id="sfp-optical-ddm">5. SFP Transceiver Diagnostics &amp; Optical dBm Power</h2>
            <p>
              Digital Diagnostic Monitoring (DDM) provides optical Transmit (Tx) and Receive (Rx) power in dBm. If Rx power drops below -18 dBm, clean fiber end-faces with a 1.25mm/2.5mm One-Click cleaner.
            </p>

            <h2 id="isolation-workflow">6. Interactive Port Flapping Isolation Workflow</h2>
            {/* MOUNTED WORKFLOW DIAGRAM */}
            <WorkflowDiagram
              title="Port Flapping Physical Layer Isolation Workflow"
              subtitle="Sequential decision tree for isolating Layer 1, 2, and 3 intermittent interface faults."
              stages={[
                {
                  step: 1,
                  title: 'Layer 1 Physical Cable Check',
                  badge: 'Physical Layer',
                  description: 'Inspect copper RJ45 locking tab, patch panel jack seating, or clean fiber optic ferrule.',
                  checklist: [
                    'Swap patch cable with certified Cat6A patch cord.',
                    'Check for physical wire damage or crushed jacket.',
                    'Inspect SFP optical DDM receive level (> -18 dBm).'
                  ]
                },
                {
                  step: 2,
                  title: 'Layer 2 Link Negotiation Triage',
                  badge: 'Data Link Layer',
                  description: 'Check speed/duplex autonegotiation alignment and CRC error counter increment speed.',
                  checklist: [
                    'Verify both ends set to Auto-Negotiation.',
                    'Check `show interface` CRC/FCS counter rate.',
                    'Confirm no L2 err-disable or storm control events.'
                  ]
                },
                {
                  step: 3,
                  title: 'Layer 3 Protocol & Power Check',
                  badge: 'Network / PoE Layer',
                  description: 'Inspect PoE power consumption budget or spanning-tree BPDU protection trips.',
                  checklist: [
                    'Verify PoE class power allocation on port.',
                    'Check spanning tree topology change notifications (TCNs).',
                    'Test port in loopback / alternate switch slot.'
                  ]
                }
              ]}
            />

            <h2 id="triage-matrix">7. Field Triage Sign-Off Checklist</h2>
            {/* MOUNTED INTERACTIVE CHECKLIST */}
            <InteractiveChecklist
              id="port_flapping_triage_checklist"
              title="Network Port Flapping Diagnostic Protocol"
              subtitle="Follow this decision tree checklist to isolate and resolve physical layer network flaps."
              items={[
                {
                  id: 'flap_1',
                  label: 'Capture Syslog Flap Timestamps & Log History',
                  description: 'Verify whether flap frequency is periodic (e.g., every 30s) or random erratic bursts.',
                  critical: true
                },
                {
                  id: 'flap_2',
                  label: 'Replace Patch Cable with Known-Good Cable',
                  description: 'Eliminate crushed conductors, loose RJ45 locking tabs, or high-resistance wire crimps.',
                  critical: true
                },
                {
                  id: 'flap_3',
                  label: 'Inspect & Clean Fiber End-Faces with One-Click Cleaner',
                  description: 'Clean dirt/oil off SFP transceiver optics and patch cord ferrule tips before re-seating.',
                  critical: true
                },
                {
                  id: 'flap_4',
                  label: 'Check Speed / Duplex Autonegotiation Mismatch',
                  description: 'Ensure both local switch port and remote endpoint are set to Auto-Negotiation.',
                  critical: false
                },
                {
                  id: 'flap_5',
                  label: 'Verify SFP Optical DDM dBm Power Levels',
                  description: 'Confirm Rx power is within documented receiver sensitivity limits (not below -18 dBm).',
                  critical: true
                }
              ]}
            />
          </div>
        );

      case 'poweredge-proliant-amber-led-indicator-cheatsheet':
        return (
          <div className="guide-embedded-body">
            {/* MOUNTED CALLOUT WARNING FOR FLEA POWER DRAIN */}
            <CalloutBlock type="warning" title="Critical Safety & Flea Power Release Warning">
              Before replacing internal server components (DIMMs, RAID controller, system board), power off the node, disconnect both AC power cables from the PDUs, and hold the power button for 15 seconds to discharge residual flea power! Failure to release flea power can cause CMOS corruption or damage replacement RAM modules.
            </CalloutBlock>

            <h2 id="overview-leds">1. Understanding Server Health LED Indicators</h2>
            <p>
              Front bezel LEDs, LCD panels, and internal Systems Insight Display (SID) LEDs signal hardware fault states before console access is established.
            </p>

            <h2 id="led-matrix">2. Dell PowerEdge &amp; HPE ProLiant LED Diagnostic Matrix</h2>
            <p>
              Use the interactive matrix below to lookup iDRAC SEL event codes, blinking amber patterns, and resolution protocols:
            </p>
            {/* MOUNTED <PowerEdgeProLiantLedMatrix /> */}
            <div style={{ margin: '24px 0' }}>
              <PowerEdgeProLiantLedMatrix />
            </div>

            <h2 id="psu-power-faults">3. Power Supply (PSU) Amber Flash Patterns</h2>
            <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--line)', padding: '16px', borderRadius: '10px', margin: '16px 0' }}>
              <ul style={{ marginBottom: 0 }}>
                <li><strong>Solid Green:</strong> PSU powered, active, and outputting healthy 12V DC power.</li>
                <li><strong>Blinking Green:</strong> PSU in standby mode or firmware update in progress.</li>
                <li><strong>Blinking Amber (1 Hz):</strong> Input AC voltage lost, PDU breaker tripped, or PSU thermal fault.</li>
                <li><strong>Solid Amber:</strong> PSU internal output failure; immediate hot-swap required.</li>
              </ul>
            </div>

            <h2 id="ram-dimm-isolation">4. Isolating RAM DIMM Faults &amp; Minimum-to-POST</h2>
            <ol style={{ lineHeight: 1.8 }}>
              <li>Identify faulted DIMM location in iDRAC9 / HPE iLO6 event log (e.g. DIMM A4).</li>
              <li>Power down server and disconnect both AC PDU leads.</li>
              <li>Perform 15-second flea power button drain.</li>
              <li>Swap DIMM A4 with DIMM A5. If the fault moves to A5, replace the DIMM stick; if it stays on A4, inspect motherboard CPU socket pin alignment.</li>
            </ol>

            <h2 id="field-recovery-steps">5. Server POST &amp; Hardware Recovery Sign-Off Checklist</h2>
            {/* MOUNTED INTERACTIVE CHECKLIST */}
            <InteractiveChecklist
              id="server_hardware_recovery_checklist"
              title="Enterprise Server Hardware Fault Isolation Protocol"
              subtitle="Step-by-step field checklist for Dell PowerEdge and HPE ProLiant degraded nodes."
              items={[
                {
                  id: 'srv_1',
                  label: 'Identify Front Bezel & LCD Indicator Status Code',
                  description: 'Record amber LED code (e.g., MEM0001 or Systems Insight Display DIMM locator).',
                  critical: true
                },
                {
                  id: 'srv_2',
                  label: 'Access iDRAC9 / HPE iLO6 Management Log',
                  description: 'Export System Event Log (SEL) or Integrated Management Log (IML) for exact component serial number.',
                  critical: true
                },
                {
                  id: 'srv_3',
                  label: 'Perform Graceful OS Shutdown & Flea Power Release',
                  description: 'Shut down hypervisor, pull both PDU power leads, and depress power button for 15 seconds.',
                  critical: true
                },
                {
                  id: 'srv_4',
                  label: 'Isolate Memory / Hardware Component',
                  description: 'Swap faulted DIMM module with adjacent slot to verify whether error follows module or motherboard slot.',
                  critical: false
                },
                {
                  id: 'srv_5',
                  label: 'Verify POST & Health Status in iDRAC/iLO Console',
                  description: 'Power on node, monitor lifecycle controller POST sequence, and verify green health LED.',
                  critical: true
                }
              ]}
            />
          </div>
        );

      case 'macbook-macos-troubleshooting-and-setup':
        return (
          <div className="guide-embedded-body">
            <CalloutBlock type="warning" title="Apple Silicon DFU Mode: Revive vs Restore Data Boundary">
              When an M1/M2/M3/M4 Mac displays an error exclamation mark or fails to boot into macOS Recovery, connect a host Mac via Thunderbolt/USB-C and Apple Configurator. Select <strong>Revive Device</strong> to update system firmware while <em>preserving user data</em>. Only select <strong>Restore Device</strong> if Revive fails, as Restore completely erases internal SSD flash storage!
            </CalloutBlock>

            <h2 id="dfu-mode">1. Apple Silicon DFU Revive vs Restore</h2>
            <p>
              DFU (Device Firmware Update) mode allows direct low-level flashing of the Apple Silicon bootloader and Secure Enclave Processor (SEP) firmware without requiring a working macOS installation.
            </p>

            <h2 id="cli-triage">2. Essential macOS Field CLI Commands</h2>
            <p>
              Execute these verified Terminal commands during macOS network and identity field triage:
            </p>
            <CopyableCliBlock
              label="Flush macOS DNS Cache & mDNSResponder"
              promptSymbol="MacBook:~"
              command="sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder"
              output={`DNS cache flushed successfully.`}
            />
            <CopyableCliBlock
              label="Reset Primary Wi-Fi / Ethernet Network Interface"
              promptSymbol="MacBook:~"
              command="sudo ifconfig en0 down && sudo ifconfig en0 up"
              output={`Interface en0 reset completed.`}
            />
            <CopyableCliBlock
              label="Verify FileVault SecureToken Status for Current User"
              promptSymbol="MacBook:~"
              command="sysadminctl -secureTokenStatus $USER"
              output={`2026-10-23 10:15:22.401 sysadminctl[1042:1204] Secure token is ENABLED for user john.doe`}
            />
            <CopyableCliBlock
              label="Verify MDM Bootstrap Token Escrow Status"
              promptSymbol="MacBook:~"
              command="sudo profiles status -type bootstraptoken"
              output={`Bootstrap Token escrow status to MDM: YES`}
            />

            <h2 id="thermal-power">3. Thermal Throttling &amp; Power Requirements</h2>
            <DoAndDontCard
              title="MacBook Power Adapter Wattage & Thermal Guidelines"
              dos={{
                title: "Recommended Power & Clamshell Standards",
                points: [
                  "Use rated USB-C Power Delivery (PD) adapters: 67W for 14\" M3/M4, 96W/140W for 16\" M3/M4 Max.",
                  "Ensure clamshell mode displays receive full USB-C PD power through Thunderbolt 4 docks.",
                  "Operate MacBooks on elevated mesh stands or hard surfaces for unobstructed bottom intake airflow.",
                  "Inspect battery cycle counts in System Information -> Power before dispatching field hardware."
                ]
              }}
              donts={{
                title: "Thermal & Power Practices to Avoid",
                points: [
                  "Under-powering 16\" MacBook Pro with 30W/45W phone/tablet chargers, leading to active battery drain under load.",
                  "Running heavy compile or video workloads on soft fabrics that block aluminum chassis heat dissipation.",
                  "Forcing closed-lid clamshell operation when external displays draw maximum GPU power without airflow clearance.",
                  "Ignoring swollen battery Trackpad resistance or chassis seam separation."
                ]
              }}
            />

            <h2 id="provisioning-checklist">4. Enterprise macOS Provisioning & Handoff Checklist</h2>
            <InteractiveChecklist
              id="macbook_provisioning_checklist"
              title="MacBook Enterprise Provisioning & Handoff Checklist"
              subtitle="Perform this step-by-step verification before issuing a MacBook to an employee."
              items={[
                {
                  id: 'mac_1',
                  label: 'Verify Automated Device Enrollment (ADE) via Jamf/Intune',
                  description: 'Power on fresh MacBook and confirm "Remote Management" screen appears during Setup Assistant.',
                  critical: true
                },
                {
                  id: 'mac_2',
                  label: 'Validate FileVault Encryption & Key Escrow',
                  description: 'Enable FileVault and confirm recovery key successfully escrows into MDM console.',
                  critical: true
                },
                {
                  id: 'mac_3',
                  label: 'Confirm SecureToken & Bootstrap Token Assignment',
                  description: 'Run `sysadminctl -secureTokenStatus` to ensure user can unlock FileVault and install OS updates.',
                  critical: true
                },
                {
                  id: 'mac_4',
                  label: 'Test Wi-Fi, Bluetooth & Thunderbolt Docking',
                  description: 'Verify 802.1X enterprise Wi-Fi connectivity, Bluetooth peripheral pairing, and dual display output.',
                  critical: false
                },
                {
                  id: 'mac_5',
                  label: 'Complete User Handoff Sign-Off',
                  description: 'Confirm employee can sign in with SSO credentials and access required productivity applications.',
                  critical: true
                }
              ]}
            />
          </div>
        );

      case 'iphone-ipad-mdm-wifi-troubleshooting':
        return (
          <div className="guide-embedded-body">
            <CalloutBlock type="info" title="Private Wi-Fi MAC Address Randomization & Captive Portals">
              iOS / iPadOS enables "Private Wi-Fi Address" by default, generating a randomized MAC address per SSID. This frequently breaks RADIUS 802.1X MAC authentication and causes captive portal dropouts (`captive.apple.com`). For enterprise networks, deploy an MDM Wi-Fi payload with "Disable Private MAC Address" configured for corporate SSIDs.
            </CalloutBlock>

            <h2 id="ade-workflow">1. Automated Device Enrollment (ADE) Workflow</h2>
            <p>
              Follow the automated zero-touch enrollment workflow for enterprise iOS/iPadOS fleet management:
            </p>
            <WorkflowDiagram
              title="iOS / iPadOS Automated Device Enrollment (ADE) via ABM"
              subtitle="Zero-touch provisioning lifecycle from supplier purchase to MDM enrollment."
              stages={[
                {
                  step: 1,
                  title: 'Apple Business Manager (ABM) Assignment',
                  badge: 'ABM Portal',
                  description: 'Reseller automatically adds device serial numbers to organization ABM instance upon purchase.',
                  checklist: [
                    'Verify serial numbers in ABM Devices list.',
                    'Assign default MDM server profile (Jamf / Intune / Kandji).',
                    'Set mandatory supervised management flag.'
                  ]
                },
                {
                  step: 2,
                  title: 'Over-The-Air Setup Assistant Activation',
                  badge: 'Device Out-of-Box',
                  description: 'User powers on device, connects to Wi-Fi, and contacts Apple Activation Server.',
                  checklist: [
                    'Apple Activation Server pushes MDM enrollment URL.',
                    'Display mandatory Remote Management enrollment screen.',
                    'Enforce organization SSO credentials sign-in.'
                  ]
                },
                {
                  step: 3,
                  title: 'MDM Configuration Payload Push',
                  badge: 'MDM Server',
                  description: 'MDM server applies corporate security profiles, Wi-Fi payloads, and managed apps.',
                  checklist: [
                    'Install enterprise 802.1X Wi-Fi certificate payload.',
                    'Enforce 6-digit passcode & FileVault/Data Protection.',
                    'Silently install managed VPP apps via Apple Volume Purchase.'
                  ]
                }
              ]}
            />

            <h2 id="private-wifi">2. Private Wi-Fi MAC Address & Captive Portals</h2>
            <p>
              When end users encounter connection failures on corporate guest networks, guide them to Settings → Wi-Fi → (i) icon → toggle off <strong>Private Wi-Fi Address</strong>, then re-authenticate at <code>http://captive.apple.com</code>.
            </p>

            <h2 id="activation-lock">3. Preventing Activation Lock Bricks</h2>
            <CalloutBlock type="warning" title="Activation Lock Hazard on Returned Fleet Devices">
              If an employee signs into personal iCloud with "Find My" enabled on a company-owned iPhone or iPad, factory resetting the device will trigger Activation Lock! Always collect device offboarding sign-outs or ensure MDM Activation Lock Bypass Codes are escrowed before wiping returned hardware.
            </CalloutBlock>

            <h2 id="depot-checklist">4. Return & Depot Inspection Checklist</h2>
            <InteractiveChecklist
              id="ios_depot_inspection_checklist"
              title="iPhone & iPad Depot Return Inspection Checklist"
              subtitle="Step-by-step verification required before re-issuing returned iOS devices."
              items={[
                {
                  id: 'ios_1',
                  label: 'Verify iCloud / Find My Sign-Out',
                  description: 'Confirm user signed out of personal Apple ID so Activation Lock is completely disarmed.',
                  critical: true
                },
                {
                  id: 'ios_2',
                  label: 'Inspect Physical Enclosure & Lightning/USB-C Port',
                  description: 'Check for chassis bending, display hairline cracks, and lint build-up inside charging port.',
                  critical: false
                },
                {
                  id: 'ios_3',
                  label: 'Perform Remote Wipe / Erase All Content & Settings',
                  description: 'Trigger full factory reset from MDM console or local Erase All Content menu.',
                  critical: true
                },
                {
                  id: 'ios_4',
                  label: 'Verify ABM Assignment for Re-Provisioning',
                  description: 'Confirm device serial remains assigned to active MDM server in Apple Business Manager.',
                  critical: true
                }
              ]}
            />
          </div>
        );

      case 'apple-continuity-airdrop-dock-triage':
        return (
          <div className="guide-embedded-body">
            <CalloutBlock type="tip" title="Field Pro-Tip: AWDL & AirDrop Discovery Triage">
              AirDrop relies on Bluetooth Low Energy (BLE) for peer discovery and Apple Wireless Direct Link (AWDL) on 5 GHz Wi-Fi channels for peer-to-peer transfers. If AirDrop fails, toggle Bluetooth and Wi-Fi off and on simultaneously, or temporarily disable 802.11 Wi-Fi client isolation on enterprise APs!
            </CalloutBlock>

            <h2 id="awdl-airdrop">1. AirDrop & AWDL Wireless Discovery Triage</h2>
            <p>
              Apple Wireless Direct Link (AWDL) establishes peer-to-peer Wi-Fi connections between Macs, iPads, and iPhones without requiring a central Wi-Fi access point.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Continuity Feature</th>
                    <th>Wireless Dependency</th>
                    <th>Common Enterprise Blockers</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>AirDrop</strong></td>
                    <td>Bluetooth LE (Discovery) + AWDL 5 GHz Wi-Fi (Transfer)</td>
                    <td>802.1X AP client isolation, 802.11a/n channel restrictions, corporate firewall AWDL blocks.</td>
                  </tr>
                  <tr>
                    <td><strong>Universal Control</strong></td>
                    <td>Bluetooth LE + Same Wi-Fi Subnet + Handoff Enabled</td>
                    <td>Different Apple ID accounts, cross-subnet IP routing, disabled Bluetooth.</td>
                  </tr>
                  <tr>
                    <td><strong>Sidecar (iPad Screen)</strong></td>
                    <td>USB-C Wired or AWDL Peer-to-Peer Wireless</td>
                    <td>VPN split-tunnel blocking local subnet, untrusted USB lightning pairing.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 id="dock-comparison">2. Thunderbolt / DP Alt-Mode vs DisplayLink Docks</h2>
            <p>
              macOS does <strong>not</strong> support Multi-Stream Transport (MST) daisy-chaining over standard USB-C DisplayPort Alt-Mode. To connect dual external displays on base M1/M2/M3/M4 MacBooks, understand the structural differences:
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Dock Technology</th>
                    <th>Display Output Capability</th>
                    <th>Driver & Overhead Requirement</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Thunderbolt 4 / USB4 Dock</strong></td>
                    <td>Native Dual 4K@60Hz (Requires M1/M2/M3/M4 Pro/Max)</td>
                    <td>Plug-and-Play zero driver overhead; uses native macOS GPU display pipes.</td>
                  </tr>
                  <tr>
                    <td><strong>USB-C DP Alt-Mode (Standard)</strong></td>
                    <td>Single Display Only on base Apple Silicon chips (MST mirror only)</td>
                    <td>Native hardware output; second display will only duplicate/mirror first screen.</td>
                  </tr>
                  <tr>
                    <td><strong>DisplayLink Compression Dock</strong></td>
                    <td>Dual or Triple External Displays on ALL MacBooks</td>
                    <td>Requires <code>DisplayLink Manager.app</code> software driver with Screen Recording permission.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 id="continuity-prereqs">3. Universal Control & Sidecar Prerequisites</h2>
            <p>
              Ensure both devices are signed into the same Apple ID with Two-Factor Authentication, have Bluetooth and Wi-Fi enabled, and have <strong>Handoff</strong> turned on in System Settings → General → AirDrop & Handoff.
            </p>

            <h2 id="dock-checklist">4. Peripheral & Continuity Diagnostic Checklist</h2>
            <InteractiveChecklist
              id="apple_continuity_dock_checklist"
              title="Apple Continuity & Peripheral Triage Checklist"
              subtitle="Field step-by-step verification for AirDrop, Universal Control, and docking station issues."
              items={[
                {
                  id: 'dock_1',
                  label: 'Verify Screen Recording Permissions for DisplayLink Docks',
                  description: 'Open System Settings -> Privacy & Security -> Screen & System Audio Recording and allow DisplayLink Manager.',
                  critical: true
                },
                {
                  id: 'dock_2',
                  label: 'Test AirDrop Peer Discovery over AWDL',
                  description: 'Set AirDrop visibility to "Everyone for 10 Minutes" on both devices and verify Bluetooth is active.',
                  critical: true
                },
                {
                  id: 'dock_3',
                  label: 'Check Universal Control Handoff Prerequisites',
                  description: 'Confirm both Mac and iPad are within 30 feet, on same Wi-Fi subnet, and Handoff is enabled.',
                  critical: false
                },
                {
                  id: 'dock_4',
                  label: 'Inspect Thunderbolt 4 Cable Rating',
                  description: 'Ensure cable displays ⚡ Thunderbolt logo and supports 40Gbps data + 100W Power Delivery.',
                  critical: true
                }
              ]}
            />
          </div>
        );

      case 'erase-and-reinstall-macos-apple-silicon-intel-field-guide':
        return (
          <div className="guide-embedded-body">
            <MacOSRecoveryGuide />
          </div>
        );

      default:
        return (
          <div
            className="note-rendered-content"
            dangerouslySetInnerHTML={{ __html: guide.contentHtml }}
          />
        );
    }
  };

  return (
    <main className="container page">
      <SeoHead
        title={guide.title}
        description={guide.description}
        canonicalUrl={`https://jawed.co.in/field-guides/${guide.slug}`}
      />

      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Guides', href: '/guides' },
          { label: guide.title },
        ]}
      />

      {/* Top Leaderboard Ad Unit */}
      <AdUnitPlaceholder slotType="top-leaderboard" />

      <article className="field-guide-article">
        {/* Header Metadata */}
        <header style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)', fontWeight: 600 }}>
              {guide.category || determineCategory(guide)}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>•</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
              {guide.readTime || calculateReadTime(guide.contentHtml || guide.description)}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>•</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Published <time dateTime={freshness.isoPublished}>{freshness.publishedFormatted}</time>
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>•</span>
            <span
              className="guide-last-updated-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                color: 'var(--muted-light)',
                padding: '3px 10px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontWeight: 500,
              }}
              title={`Field guide last updated on ${freshness.updatedFormatted}`}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--emerald, #10b981)',
                  display: 'inline-block',
                }}
              />
              <span>
                Last Updated:{' '}
                <time dateTime={freshness.isoUpdated} style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                  {freshness.updatedFormatted}
                </time>
              </span>
            </span>
          </div>

          <h1 style={{ fontSize: '2.2rem', lineHeight: 1.25, marginBottom: '16px', color: 'var(--text-heading)' }}>
            {guide.title}
          </h1>

          <p className="lead" style={{ fontSize: '1.1rem', color: 'var(--muted-light)', marginBottom: '20px' }}>
            {guide.description}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--line)', flexShrink: 0 }}>
                <Image
                  src="/apple-touch-icon.png"
                  alt={guide.author}
                  width={40}
                  height={40}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-heading)', fontSize: '0.95rem' }}>{guide.author}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>IT Support &amp; Workplace Engineering Lead</span>
              </div>
            </div>

            {/* Social Share Bar */}
            <SocialShareBar
              title={guide.title}
              text={guide.description}
              url={currentUrl}
            />
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '36px', alignItems: 'start' }} className="article-layout">
          {/* Main Article Content */}
          <div className="article-body">
            {renderGuideBodyContent()}

            {/* In-Feed Native Ad Unit */}
            <AdUnitPlaceholder slotType="in-feed" />

            {/* Article Footer & Keywords */}
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--line)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '12px' }}>
                <strong>Keywords:</strong> {guide.keywords.join(' • ')}
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link className="button button-primary" to="/tools/it-troubleshooting-assistant">
                  Launch IT Troubleshooting Assistant →
                </Link>
                <Link className="button button-secondary" to="/field-guides">
                  ← Back to Field Guides List
                </Link>
              </div>
            </div>
          </div>

          {/* Sticky Sidebar */}
          <aside className="article-sidebar" style={{ position: 'sticky', top: '90px' }}>
            <div className="card" style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
              <h3 style={{ fontSize: '1.05rem', margin: '0 0 14px', color: 'var(--text-heading)', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                📋 Table of Contents
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '10px' }}>
                {guide.toc.map(item => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      style={{ fontSize: '0.875rem', color: 'var(--muted-light)', textDecoration: 'none', display: 'block', lineHeight: '1.4' }}
                      className="toc-link"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Help Callout */}
            <div className="card" style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-darker)', border: '1px solid var(--line)' }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--accent)', display: 'block', marginBottom: '6px' }}>
                ⚡ Need Field Dispatch?
              </strong>
              <p style={{ fontSize: '0.825rem', color: 'var(--muted)', margin: '0 0 12px' }}>
                On-site server rack cabling or emergency network port troubleshooting required?
              </p>
              <Link to="/services" className="button button-secondary" style={{ width: '100%', textAlign: 'center', fontSize: '0.8rem', padding: '6px' }}>
                Book IT Dispatch →
              </Link>
            </div>

            {/* Sidebar Skyscraper / Rectangle Ad Unit */}
            <AdUnitPlaceholder slotType="sidebar-unit" />
          </aside>
        </div>

        {/* Newsletter Subscription Form */}
        <NewsletterSubscribeForm sourceLocation={`field-guide-${guide.slug}`} />

        {/* Related Articles Widget */}
        <section style={{ marginTop: '40px', paddingTop: '32px', borderTop: '2px solid var(--line)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text-heading)' }}>
            📚 Related Technical Field Guides
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
            Deep-dive troubleshooting procedures and field checklists written by IT engineers.
          </p>

          <div className="card-grid three">
            {relatedGuides.map(rel => (
              <article key={rel.slug} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span className="badge" style={{ fontSize: '0.75rem', marginBottom: '8px', display: 'inline-block' }}>
                    {rel.category}
                  </span>
                  <h3 style={{ fontSize: '1.1rem', margin: '6px 0 10px', lineHeight: '1.3' }}>
                    <Link to={`/field-guides/${rel.slug}`} style={{ textDecoration: 'none', color: 'var(--text-heading)' }}>
                      {rel.title}
                    </Link>
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 16px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {rel.description}
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--line)', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  <span>{rel.readTime}</span>
                  <Link to={`/field-guides/${rel.slug}`} style={{ fontWeight: 600, color: 'var(--accent)' }}>
                    Read Guide →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
};
