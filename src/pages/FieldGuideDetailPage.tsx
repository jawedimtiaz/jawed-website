import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { FIELD_GUIDES, determineCategory } from '../data/fieldGuidesData';
import { AdUnitPlaceholder } from '../components/AdUnitPlaceholder';
import { SeoHead } from '../components/SeoHead';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { Image } from '../components/Image';

// Visual Guide Interactive Components
import { DosAndDontsCard } from '../components/guides/DosAndDontsCard';
import { InteractiveChecklist } from '../components/guides/InteractiveChecklist';
import { CalloutBlock } from '../components/guides/CalloutBlock';
import { PinoutDiagram } from '../components/guides/PinoutDiagram';
import { RackElevationDiagram } from '../components/guides/RackElevationDiagram';
import { LedStatusMatrix } from '../components/guides/LedStatusMatrix';
import { CopyableCodeBlock } from '../components/guides/CopyableCodeBlock';

export const FieldGuideDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const guide = FIELD_GUIDES.find(g => g.slug === slug);

  if (!guide) {
    return <Navigate to="/guides" replace />;
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const relatedGuides = FIELD_GUIDES.filter(g => g.slug !== guide.slug);

  // Custom interactive visual enhancements based on guide slug
  const renderGuideInteractiveVisuals = () => {
    switch (guide.slug) {
      case 'server-rack-cable-management-best-practices':
        return (
          <div className="guide-visual-enhancements" style={{ marginTop: '32px' }}>
            <CalloutBlock type="spec" title="ANSI/TIA-606-D Administration & Labeling Specification">
              All data center patch cabling must be labeled on both ends within 100mm (4 inches) of the connector using durable heat-shrink or self-laminating vinyl labels formatted as: <code>{"[Origin Rack]-[Device]-[Port] ===> [Dest Rack]-[Device]-[Port]"}</code>.
            </CalloutBlock>

            <RackElevationDiagram />

            <DosAndDontsCard
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
          <div className="guide-visual-enhancements" style={{ marginTop: '32px' }}>
            <CalloutBlock type="warning" title="Field Safety & Wiremap Rules">
              Never mix T568A and T568B terminations on opposite ends of a single straight-through cable link unless deliberately constructing a legacy 10/100BASE-T crossover cable. Mixed terminations swap Tx and Rx pairs and cause physical layer autonegotiation failure on legacy hardware!
            </CalloutBlock>

            <PinoutDiagram initialStandard="both" />

            <DosAndDontsCard
              title="RJ45 Field Crimping & Termination Standards"
              dos={{
                title: "Precision Pass-Through Crimping Method",
                points: [
                  "Maintain pair twists up to within 13mm (0.5 in) of the gold contact blades.",
                  "Use ratcheting crimp tools with built-in flush wire flush trimming blades.",
                  "Ensure the outer PVC cable jacket extends inside the plug housing past the strain-relief wedge.",
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
          <div className="guide-visual-enhancements" style={{ marginTop: '32px' }}>
            <CalloutBlock type="tip" title="Field Pro-Tip: Fast Port Flap Diagnosis">
              When encountering rapid <code>{"LINK-UP / LINK-DOWN"}</code> syslog messages, immediately check the physical layer first: replace the patch cable and inspect SFP optical DDM receive levels before altering switch configuration!
            </CalloutBlock>

            <div style={{ margin: '24px 0' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-heading)', marginBottom: '14px' }}>
                💻 Interactive Cisco IOS &amp; Aruba CX Diagnostic CLI Commands
              </h3>
              <CopyableCodeBlock
                label="Cisco IOS / IOS-XE Port Flap Triage Sequence"
                promptSymbol="Switch#"
                command="show logging | include LINK-3-UPDOWN|LINEPROTO-5-UPDOWN"
                output={`%LINK-3-UPDOWN: Interface GigabitEthernet1/0/12, changed state to down\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet1/0/12, changed state to down`}
              />
              <CopyableCodeBlock
                label="Cisco IOS Check Interface CRC & FCS Errors"
                promptSymbol="Switch#"
                command="show interfaces GigabitEthernet1/0/12 counters errors"
                output={`Port      Align-Err  FCS-Err  Xmit-Err  Rcv-Err  UnderSize  OutDiscards\nGi1/0/12          0     4821         0     4821          0            0`}
              />
              <CopyableCodeBlock
                label="Aruba OS-CX Inspect Optical Transceiver DDM Levels"
                promptSymbol="Switch#"
                command="show interface 1/1/12 transceiver detail"
                output={`Transceiver Diagnostics :\n  Rx Power : -14.2 dBm [ Normal Range: -18.0 to -3.0 dBm ]\n  Tx Power : -2.1 dBm  [ Normal Range: -9.5 to -1.0 dBm ]`}
              />
            </div>

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
          <div className="guide-visual-enhancements" style={{ marginTop: '32px' }}>
            <CalloutBlock type="warning" title="Critical Safety & Flea Power Release Warning">
              Before replacing internal server components (DIMMs, RAID controller, system board), power off the node, disconnect both AC power cables from the PDUs, and hold the power button for 15 seconds to discharge residual flea power! Failure to release flea power can cause CMOS corruption or damage replacement RAM modules.
            </CalloutBlock>

            <LedStatusMatrix />

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

      default:
        return null;
    }
  };

  return (
    <main className="container page">
      <SeoHead
        title={guide.title}
        description={guide.description}
        canonicalUrl={currentUrl}
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
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{guide.readTime}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>•</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Published {guide.publishedDate}</span>
            {guide.updatedDate && guide.updatedDate !== guide.publishedDate && (
              <>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>•</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Updated {guide.updatedDate}</span>
              </>
            )}
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
            {/* Rendered HTML Content */}
            <div
              className="note-rendered-content"
              dangerouslySetInnerHTML={{ __html: guide.contentHtml }}
            />

            {/* Interactive Visual Enhancement Modules */}
            {renderGuideInteractiveVisuals()}

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

        {/* Related Articles Widget */}
        <section style={{ marginTop: '60px', paddingTop: '40px', borderTop: '2px solid var(--line)' }}>
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
                    <Link to={`/guides/${rel.slug}`} style={{ textDecoration: 'none', color: 'var(--text-heading)' }}>
                      {rel.title}
                    </Link>
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 16px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {rel.description}
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--line)', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  <span>{rel.readTime}</span>
                  <Link to={`/guides/${rel.slug}`} style={{ fontWeight: 600, color: 'var(--accent)' }}>
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
