export interface FieldGuide {
  slug: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  publishedDate: string;
  author: string;
  keywords: string[];
  toc: { id: string; text: string }[];
  contentHtml: string;
}

export const FIELD_GUIDES: FieldGuide[] = [
  {
    slug: 'rj45-cabling-t568a-vs-t568b-guide',
    title: 'Comprehensive Guide to RJ45 Cabling: T568A vs T568B Standards, Pinouts, and Field Verification',
    description: 'Master RJ45 color coding standards, T568A vs T568B pinout tables, crimping best practices, and wiremap diagnostic readings for field technicians.',
    category: 'Network Infrastructure',
    readTime: '8 min read',
    publishedDate: 'October 20, 2026',
    author: 'Jawed Imtiaz (IT Field Lead)',
    keywords: ['RJ45', 'T568B', 'T568A', 'Cat6', 'Ethernet Pinout', 'Cable Tester', 'Wiremap', 'Crimping'],
    toc: [
      { id: 'overview', text: '1. Overview of ANSI/TIA-568 Standards' },
      { id: 'pinout-tables', text: '2. T568A vs T568B Color Code Pinout Tables' },
      { id: 'straight-vs-crossover', text: '3. Straight-Through vs Crossover Configurations' },
      { id: 'crimping-mistakes', text: '4. Top 5 Field Crimping Mistakes to Avoid' },
      { id: 'field-verification', text: '5. Cable Tester Readings & Wiremap Fault Diagnosis' },
      { id: 'key-takeaways', text: '6. Field Summary & Checklist' }
    ],
    contentHtml: `
      <div className="card" style="border-left: 4px solid var(--accent); background: var(--surface); padding: 18px; margin-bottom: 24px;">
        <strong style="color: var(--accent); font-size: 1.05rem;">⚡ Field Engineering Summary</strong>
        <p style="margin: 8px 0 0; font-size: 0.95rem;">
          Both <strong>T568A</strong> and <strong>T568B</strong> are recognized pin/pair schemes. Use the scheme specified by the project, customer, contract or existing cabling design, and keep the same scheme at both ends of a straight-through link. Do not change an established site standard without approval.
        </p>
      </div>

      <h2 id="overview">1. Overview of ANSI/TIA-568 Standards</h2>
      <p>
        The <strong>ANSI/TIA-568</strong> commercial building telecommunications cabling standard defines the pin/pair assignments for eight-conductor 100-ohm balanced twisted-pair cabling (Cat5e, Cat6, and Cat6A). Proper termination requires maintaining the tight physical twist of signal pairs right up to the RJ45 (8P8C) plug contact blades.
      </p>
      <p>
        T568A and T568B differ in the placement of the orange and green pairs. Using one scheme at each end creates a traditional crossover wiring arrangement for Ethernet modes that depend on separate transmit and receive pairs. Whether a crossover causes a link problem depends on the endpoint PHY and Auto-MDI-X support; do not diagnose a fault from cable color alone. Gigabit Ethernet uses all four pairs bidirectionally, so older Tx/Rx labels are not a complete description of modern signaling.
      </p>

      <h2 id="pinout-tables">2. T568A vs T568B Color Code Pinout Tables</h2>
      <p>
        When holding an RJ45 connector with the locking clip facing <strong>downward</strong> (away from you) and the gold contacts facing <strong>upward</strong>, Pin 1 is on the far left and Pin 8 is on the far right.
      </p>

      <div style="overflow-x: auto; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; background: var(--bg-darker); border: 1px solid var(--line);">
          <thead>
            <tr style="background: var(--surface-hover); color: var(--text-heading); text-align: left;">
              <th style="padding: 12px; border: 1px solid var(--line);">Pin #</th>
              <th style="padding: 12px; border: 1px solid var(--line);">Pair assignment</th>
              <th style="padding: 12px; border: 1px solid var(--line);">T568A Wire Color</th>
              <th style="padding: 12px; border: 1px solid var(--line);">T568B Wire Color</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-weight: bold;">Pin 1</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Pair 3 (T568A) / Pair 2 (T568B)</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #34d399;">White / Green</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #fb923c;">White / Orange</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-weight: bold;">Pin 2</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Pair 3 (T568A) / Pair 2 (T568B)</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #10b981;">Solid Green</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #f97316;">Solid Orange</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-weight: bold;">Pin 3</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Pair 2 (T568A) / Pair 3 (T568B)</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #fb923c;">White / Orange</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #34d399;">White / Green</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-weight: bold;">Pin 4</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Bi-directional (Pair 1)</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #38bdf8;">Solid Blue</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #38bdf8;">Solid Blue</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-weight: bold;">Pin 5</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Bi-directional (Pair 1)</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #7dd3fc;">White / Blue</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #7dd3fc;">White / Blue</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-weight: bold;">Pin 6</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Pair 2 (T568A) / Pair 3 (T568B)</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #f97316;">Solid Orange</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #10b981;">Solid Green</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-weight: bold;">Pin 7</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Bi-directional (Pair 4)</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #a16207;">White / Brown</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #a16207;">White / Brown</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-weight: bold;">Pin 8</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Bi-directional (Pair 4)</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #854d0e;">Solid Brown</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #854d0e;">Solid Brown</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="straight-vs-crossover">3. Straight-Through vs Crossover Configurations</h2>
      <p>
        Understanding when to employ straight-through versus crossover terminations prevents physical layer link negotiation failures:
      </p>
      <ul>
        <li><strong>Straight-Through Cable:</strong> Both ends are terminated with the same pattern (T568B to T568B OR T568A to T568A). Used to connect dissimilar devices, such as a Workstation/Server to a Switch port or a Router to a LAN switch.</li>
        <li><strong>Crossover Cable:</strong> One end terminated in T568A and the opposite end in T568B. Swaps Transmit (Pins 1/2) and Receive (Pins 3/6) pairs. Historically required to connect like-to-like equipment (Switch-to-Switch, Router-to-Router, or PC-to-PC).</li>
        <li><strong>Auto-MDIX (Automatic Medium-Dependent Interface Crossover):</strong> Modern Gigabit and 10GbE network interfaces automatically detect cable pinout types and reconfigure internal PHY logic. However, manual fixed-pinout legacy devices still require proper straight-through cables.</li>
      </ul>

      <h2 id="crimping-mistakes">4. Top 5 Field Crimping Mistakes to Avoid</h2>
      <ol style="line-height: 1.8;">
        <li><strong>Excessive Pair Untwisting:</strong> Stripping outer jacket back too far and untwisting pairs more than 0.5 inches (13 mm) introduces high <strong>Near-End Crosstalk (NEXT)</strong>, causing Cat6 cables to fail certification at Gigabit frequencies.</li>
        <li><strong>Jacket Strain Relief Failure:</strong> Failing to push the outer PVC cable jacket inside the RJ45 housing under the primary crimp wedge leads to wire fatigue, intermittent pin contact, and wire pull-outs.</li>
        <li><strong>Incomplete Pin Penetration:</strong> Using non-ratcheting crimpers or applying insufficient force prevents the gold-plated contact prongs from piercing copper wire insulation evenly.</li>
        <li><strong>Crossed Pairs / Wrong Wire Sequence:</strong> Swapping Pin 3 (White/Green) and Pin 5 (White/Blue) during manual fan-out leads to immediate pinout failures.</li>
        <li><strong>Using Solid Wire Plugs on Stranded Cable:</strong> Solid conductor cables require 3-prong insulation displacement contacts (IDC), whereas stranded patch cables require 2-prong contacts. Mismatched plugs produce high resistance and thermal degradation over PoE+.</li>
      </ol>

      <h2 id="field-verification">5. Cable Tester Readings & Wiremap Fault Diagnosis</h2>
      <p>
        Field technicians must interpret continuity wiremapper LED displays to rapidly isolate cable faults:
      </p>
      <div style="background: var(--bg-darker); border: 1px solid var(--line); padding: 16px; border-radius: 10px; margin: 16px 0;">
        <h4 style="margin-top: 0; color: var(--accent);">Diagnostic Fault Interpretation:</h4>
        <ul style="margin-bottom: 0;">
          <li><strong>Open Circuit (e.g. Pin 3 Off):</strong> Pin 3 conductor broken internally or contact prong failed to pierce insulation blade.</li>
          <li><strong>Short Circuit (e.g. LEDs 1 & 2 illuminate together):</strong> Conductors contacting each other due to crushed cable jacket or wire blade bridge.</li>
          <li><strong>Reversed Pair (1-2 shows 2-1 on far end):</strong> Individual wires within a single pair swapped at one termination block.</li>
          <li><strong>Split Pair (Continuity 1-8 correct, but high error rates):</strong> Individual wires from two different twisted pairs terminated onto a pair position (e.g. Orange and Green mixed). Cancels differential noise immunity!</li>
        </ul>
      </div>

      <h2 id="key-takeaways">6. Field Summary & Checklist</h2>
      <ul>
        <li>Use the approved site/project wiring scheme consistently; do not prescribe T568A or T568B universally.</li>
        <li>Keep pair untwist as short as required by the cable manufacturer and applicable installation standard.</li>
        <li>Test each new termination with a suitable wiremap tester. Where acceptance requires performance certification, use an appropriate cable certifier and follow the approved PoE installation procedure.</li>
      </ul>
      <h2 id="references">Sources and further reading</h2>
      <ul>
        <li><a href="https://www.h3c.com/en/d_202211/1715520_294551_0.htm" target="_blank" rel="noopener noreferrer">H3C documentation: Ethernet RJ-45 connector pinout and T568A/T568B assignments</a>.</li>
        <li><a href="https://www.intel.com/content/www/us/en/support/articles/000007187/ethernet-products.html" target="_blank" rel="noopener noreferrer">Intel Support: Ethernet cabling specifications and crossover wiring</a>.</li>
      </ul>
      <p>Use the project specification and the cable/connector manufacturer's instructions for acceptance limits. A continuity or wiremap test does not by itself certify a link's Cat5e/Cat6/Cat6A performance.</p>

    `
  },
  {
    slug: 'server-rack-cable-management-best-practices',
    title: 'Step-by-Step Server Rack Cable Management: Patch Panel to Switch Best Practices',
    description: 'Learn professional server rack cable routing, Cat6A bend radius rules, velcro vs zip-tie guidelines, hot/cold aisle thermal management, and ANSI/TIA-606-C labeling standards.',
    category: 'Data Center & Hardware',
    readTime: '9 min read',
    publishedDate: 'October 20, 2026',
    author: 'Jawed Imtiaz (IT Field Lead)',
    keywords: ['Server Rack', 'Cable Management', 'Patch Panel', 'Cat6A Bend Radius', 'Velcro vs Zip Ties', 'ANSI/TIA-606-C'],
    toc: [
      { id: 'rack-architecture', text: '1. Modern Rack Cabling Architecture' },
      { id: 'bend-radius', text: '2. Cat6A & Fiber Bend Radius Rules' },
      { id: 'velcro-vs-zipties', text: '3. Velcro Straps vs Zip-Ties Guidelines' },
      { id: 'airflow-thermal', text: '4. Airflow & Hot/Cold Aisle Thermal Optimization' },
      { id: 'labeling-standards', text: '5. ANSI/TIA-606-C Labeling Conventions' },
      { id: 'rack-checklist', text: '6. Server Rack Dressing Checklist' }
    ],
    contentHtml: `
      <div className="card" style="border-left: 4px solid var(--teal); background: var(--surface); padding: 18px; margin-bottom: 24px;">
        <strong style="color: var(--teal); font-size: 1.05rem;">🛠 Field Engineering Standard</strong>
        <p style="margin: 8px 0 0; font-size: 0.95rem;">
          Clean data center cable dressing is an operational necessity. Proper cable management preserves structural bend radii, prevents thermal exhaust blockages, eliminates alien crosstalk, and reduces Mean Time to Repair (MTTR) during hardware swaps.
        </p>
      </div>

      <h2 id="rack-architecture">1. Modern Rack Cabling Architecture</h2>
      <p>
        In enterprise data centers and network closets (IDFs), two primary physical switch-to-patch architectures dominate:
      </p>
      <ul>
        <li><strong>Top-of-Rack (ToR):</strong> Switches are installed in the top 1U-2U of every server rack. Patch cables run short distances directly down to servers. Minimizes long copper horizontal runs and simplifies expansion.</li>
        <li><strong>Structured Patch Panel-to-Switch Interconnect (1:1 Port Mapping):</strong> 24-port or 48-port patch panels alternate directly above or below 1U network switches. Utilizing 6-inch or 1-foot ultra-thin Cat6A patch cords eliminates the need for bulky horizontal cable managers.</li>
      </ul>

      <h2 id="bend-radius">2. Cat6A & Fiber Bend Radius Rules</h2>
      <p>
        Bending network cables beyond manufacturer mechanical limits causes conductor deformation, impedance changes, signal reflection (Return Loss), and micro-fractures in optical fibers:
      </p>

      <div style="overflow-x: auto; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; background: var(--bg-darker); border: 1px solid var(--line);">
          <thead>
            <tr style="background: var(--surface-hover); color: var(--text-heading); text-align: left;">
              <th style="padding: 12px; border: 1px solid var(--line);">Cable Type</th>
              <th style="padding: 12px; border: 1px solid var(--line);">Minimum Bend Radius Rule</th>
              <th style="padding: 12px; border: 1px solid var(--line);">Typical Min Radius (Inches / mm)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-weight: bold;">Cat5e / Cat6 UTP</td>
              <td style="padding: 10px; border: 1px solid var(--line);">4x Outer Cable Diameter (OD)</td>
              <td style="padding: 10px; border: 1px solid var(--line);">1.0 in (25 mm)</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-weight: bold;">Cat6A Shielded (F/UTP or S/FTP)</td>
              <td style="padding: 10px; border: 1px solid var(--line);">8x Outer Cable Diameter (OD)</td>
              <td style="padding: 10px; border: 1px solid var(--line);">2.5 in (64 mm)</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-weight: bold;">Single-Mode Fiber (OS2 Zipcord)</td>
              <td style="padding: 10px; border: 1px solid var(--line);">10x Outer Cable Diameter (Unloaded)</td>
              <td style="padding: 10px; border: 1px solid var(--line);">1.2 in (30 mm)</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-weight: bold;">Armored Fiber Patch Cords</td>
              <td style="padding: 10px; border: 1px solid var(--line);">12x Outer Cable Diameter</td>
              <td style="padding: 10px; border: 1px solid var(--line);">2.0 in (50 mm)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="velcro-vs-zipties">3. Velcro Straps vs Zip-Ties Guidelines</h2>
      <p>
        <strong>Strict Rule: Plastic nylon zip-ties are forbidden on high-speed copper and fiber patch cabling in modern data centers.</strong>
      </p>
      <ul>
        <li><strong>Why Zip-Ties Fail:</strong> Zip-ties apply point-compression forces that crush internal copper wire twists and pinch fiber cladding. On Cat6A cables, crushed pairs cause severe <strong>Alien Crosstalk (ANEXT)</strong> and physical signal degradation. Furthermore, removing zip-ties with flush cutters risks severing adjacent cables.</li>
        <li><strong>The Velcro Standard:</strong> Reusable hook-and-loop (Velcro) straps distribute bundle pressure evenly without crushing outer jackets. Wrap Velcro snug enough to support bundle weight, but loose enough that individual cables can still slide under firm pull force.</li>
      </ul>

      <h2 id="airflow-thermal">4. Airflow & Hot/Cold Aisle Thermal Optimization</h2>
      <p>
        Unmanaged cable bundles hanging across server fan exhausts restrict air circulation, raising server internal CPU intake temperatures by 5°C to 12°C:
      </p>
      <ol style="line-height: 1.8;">
        <li><strong>Clear the Hot Aisle Exhaust:</strong> Route power cables (PDUs) and network cabling along vertical side rails or dedicated zero-U vertical managers. Never block server rear power supply fan exhausts.</li>
        <li><strong>Separate Copper and Power Cabling:</strong> Maintain at least 2 inches (50 mm) separation between 230V PDU power cords and Category 6/6A data cables to eliminate electromagnetic interference (EMI).</li>
        <li><strong>Install Blanking Panels:</strong> Fill all unused vertical rack units (U space) with 1U/2U blanking panels to prevent hot exhaust air from recirculating back into the cold aisle.</li>
      </ol>

      <h2 id="labeling-standards">5. ANSI/TIA-606-C Labeling Conventions</h2>
      <p>
        Adhering to the <strong>ANSI/TIA-606-C Administration Standard</strong> ensures every cable can be traced in seconds during a crisis.
      </p>
      <p>
        Labels should be self-laminating vinyl flags applied within 4 inches (100 mm) of each termination plug on both ends:
      </p>
      <div style="background: var(--bg-darker); border: 1px solid var(--line); padding: 16px; border-radius: 10px; font-family: monospace; color: var(--emerald);">
        [Origin Rack]-[Origin Panel/Device]-[Port] ===> [Dest Rack]-[Dest Panel/Device]-[Port]<br/>
        Example: RACK01-PP02-P14 ===> RACK03-SW01-P28
      </div>

      <h2 id="rack-checklist">6. Server Rack Dressing Checklist</h2>
      <ul>
        <li>[ ] Choose patch-cord type, gauge and length for the actual route, port density, PoE load, airflow and manufacturer requirements.</li>
        <li>[ ] Use suitable hook-and-loop straps or cable managers; secure bundles without crushing jackets or restricting maintenance access. Follow the rack and cabling design rather than a universal strap spacing.</li>
        <li>[ ] Follow the specified minimum bend radius for each copper or fiber cable; the value depends on cable construction and installation conditions.</li>
        <li>[ ] Label both cable ends in accordance with ANSI/TIA-606-C.</li>
      </ul>
      <h2 id="references">Sources and further reading</h2>
      <ul>
        <li><a href="https://www.commscope.com/blog/2018/guide-to-patch-cord-management-using-twisted-pair-infrastructure/" target="_blank" rel="noopener noreferrer">CommScope: Guide to patch-cord management using twisted-pair infrastructure</a>.</li>
        <li><a href="https://www.commscope.com/resources/knowledge/what-are-the-fundamentals-of-cable-management/" target="_blank" rel="noopener noreferrer">CommScope: Fundamentals of cable management</a>.</li>
      </ul>
      <p>These references are general guidance. Follow the actual cable datasheet, rack layout, thermal design and applicable site standard when choosing bend radius, bundling and labeling practices.</p>

    `
  },
  {
    slug: 'diagnosing-network-port-flapping-cli-guide',
    title: 'Diagnosing Network Port Flapping: CLI Commands, Duplex Mismatches, and Physical Layer Faults',
    description: 'Troubleshoot intermittent link flapping, speed/duplex autonegotiation mismatches, CRC FCS packet errors, and SFP transceiver optical levels using Cisco IOS and Aruba CX CLI workflows.',
    category: 'Network Switching & Triage',
    readTime: '10 min read',
    publishedDate: 'October 20, 2026',
    author: 'Jawed Imtiaz (IT Field Lead)',
    keywords: ['Port Flapping', 'CLI Commands', 'Duplex Mismatch', 'Cisco IOS', 'Aruba CX', 'CRC Errors', 'SFP DDM'],
    toc: [
      { id: 'link-flapping-causes', text: '1. What Causes Network Port Flapping?' },
      { id: 'cisco-cli-workflow', text: '2. Cisco IOS / IOS-XE Diagnostic CLI Workflow' },
      { id: 'aruba-cli-workflow', text: '3. Aruba OS-CX Diagnostic CLI Workflow' },
      { id: 'duplex-mismatch', text: '4. Isolating Speed & Duplex Mismatches' },
      { id: 'sfp-optical-ddm', text: '5. SFP Transceiver Diagnostics & Optical dBm Power' },
      { id: 'triage-matrix', text: '6. Field Triage Resolution Matrix' }
    ],
    contentHtml: `
      <div className="card" style="border-left: 4px solid var(--indigo); background: var(--surface); padding: 18px; margin-bottom: 24px;">
        <strong style="color: var(--indigo); font-size: 1.05rem;">🔍 Diagnostic Field Protocol</strong>
        <p style="margin: 8px 0 0; font-size: 0.95rem;">
          Port flapping occurs when a physical network interface rapidly transitions between <code>LINK-UP</code> and <code>LINK-DOWN</code> states. This article provides exact CLI command sequences and error counter interpretations to isolate bad patch cables, SFP optical degradation, and autonegotiation mismatches.
        </p>
      </div>

      <h2 id="link-flapping-causes">1. What Causes Network Port Flapping?</h2>
      <p>
        Intermittent interface flapping disrupts STP topology recalculations, triggers OSPF neighbor drops, and degrades VoIP call quality. Primary root causes include:
      </p>
      <ul>
        <li><strong>Physical Layer (L1):</strong> Damaged copper patch cables, loose RJ45 locking tabs, dirty fiber end-faces, or failing SFP transceivers.</li>
        <li><strong>Speed/Duplex Mismatch:</strong> One side hardcoded to Full-Duplex while the peer is set to Auto-negotiation.</li>
        <li><strong>PoE Over-Current Trips:</strong> IP camera or Access Point drawing power exceeding port PoE budget limits.</li>
        <li><strong>EEE (Energy Efficient Ethernet) Sleep Glitches:</strong> Power-saving PHY state mismatches between host NICs and switch ASICs.</li>
      </ul>

      <h2 id="cisco-cli-workflow">2. Cisco IOS / IOS-XE Diagnostic CLI Workflow</h2>
      <p>
        Execute these commands sequentially on Cisco Catalyst / Nexus switches to isolate the failure point:
      </p>

      <div style="background: var(--bg-darker); border: 1px solid var(--line); padding: 16px; border-radius: 10px; font-family: monospace; color: var(--accent); margin: 16px 0;">
        # Step 1: Check system logs for flap events and timestamps<br/>
        Switch# show logging | include LINK-3-UPDOWN|LINEPROTO-5-UPDOWN<br/><br/>
        # Step 2: Inspect interface status, duplex, and error counters<br/>
        Switch# show interface GigabitEthernet1/0/12<br/><br/>
        # Step 3: Check detailed controller register statistics<br/>
        Switch# show interfaces GigabitEthernet1/0/12 counters errors
      </div>

      <p><strong>Interpreting Cisco Output Counters:</strong></p>
      <ul>
        <li><strong>FCS Errors (Frame Check Sequence):</strong> Indicates corrupted frames arriving at the ASIC. Almost always caused by bad copper cables, loose connectors, or electrical EMI noise.</li>
        <li><strong>Late Collisions:</strong> Indicates a <strong>Duplex Mismatch</strong> where a half-duplex node transmits after the 512-bit slot time has passed.</li>
        <li><strong>Runts / Giants:</strong> Runts (< 64 bytes) indicate collision or bad NIC driver; Giants (> 1518/9000 bytes) indicate MTU mismatch.</li>
      </ul>

      <h2 id="aruba-cli-workflow">3. Aruba OS-CX Diagnostic CLI Workflow</h2>
      <p>
        For Aruba OS-CX switches (6300/8320/8360 series), use the following diagnostic command sequences:
      </p>

      <div style="background: var(--bg-darker); border: 1px solid var(--line); padding: 16px; border-radius: 10px; font-family: monospace; color: var(--teal); margin: 16px 0;">
        # Step 1: Inspect event logs for interface state transitions<br/>
        Switch# show events category port-mgr | include 1/1/12<br/><br/>
        # Step 2: Check interface status, speed, and error rates<br/>
        Switch# show interface 1/1/12<br/><br/>
        # Step 3: Inspect optical SFP DDM power levels<br/>
        Switch# show interface 1/1/12 transceiver detail
      </div>

      <h2 id="duplex-mismatch">4. Isolating Speed & Duplex Mismatches</h2>
      <p>
        When IEEE 802.3u autonegotiation fails or is improperly configured, the autonegotiation protocol defaults to **Half-Duplex** if speed sensing succeeds but duplex handshake fails:
      </p>

      <div style="overflow-x: auto; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; background: var(--bg-darker); border: 1px solid var(--line);">
          <thead>
            <tr style="background: var(--surface-hover); color: var(--text-heading); text-align: left;">
              <th style="padding: 12px; border: 1px solid var(--line);">Local Switch Port</th>
              <th style="padding: 12px; border: 1px solid var(--line);">Remote Device Port</th>
              <th style="padding: 12px; border: 1px solid var(--line);">Resulting Link Behavior</th>
              <th style="padding: 12px; border: 1px solid var(--line);">Observed Symptoms</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line);">Auto-Negotiate</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Auto-Negotiate</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #34d399;">Full-Duplex (Optimal)</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Zero errors, full throughput.</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line);">Hardcoded 100/Full</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Auto-Negotiate</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #f43f5e;">Duplex Mismatch!</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Remote side falls back to 100/Half. Massive late collisions and slow TCP speed.</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line);">Hardcoded 1000/Full</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Hardcoded 1000/Full</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #fbbf24;">Manual Full-Duplex</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Works, but violates Gigabit standard requirement for autonegotiation.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="sfp-optical-ddm">5. SFP Transceiver Diagnostics & Optical dBm Power</h2>
      <p>
        Digital Diagnostic Monitoring (DDM) can report optical Transmit (Tx) and Receive (Rx) power in dBm. Interpret readings against the exact transceiver's datasheet and the switch platform's documented alarm thresholds; supported wavelengths, distances, optic models and acceptable ranges differ:
      </p>
      <ul>
        <li><strong>Rx power below the documented receiver range:</strong> Possible causes include excessive loss, contamination, a damaged patch lead, a bend-radius violation, incompatible optics or a remote transmitter issue. Inspect and clean using the approved procedure, then compare readings with the optic specifications.</li>
        <li><strong>Rx power above the documented receiver range:</strong> Confirm the exact optic's maximum receive level and the platform's alarms before considering attenuation. Do not apply an attenuator based on a generic dBm threshold.</li>
        <li><strong>Tx reading at or near a reported fault value:</strong> Treat it as a diagnostic clue, not a universal failure code. Verify the transceiver model, supported optic, DOM capability and vendor-defined thresholds before reseating or replacing hardware.</li>
      </ul>

      <h2 id="triage-matrix">6. Field Triage Resolution Matrix</h2>
      <ol style="line-height: 1.8;">
        <li>Swap the patch cable with a known-good Cat6A factory cable.</li>
        <li>Ensure both local and remote interfaces are set to <code>speed auto</code> and <code>duplex auto</code>.</li>
        <li>Clean fiber LC connectors using an approved 1.25mm/2.5mm optical cleaning pen.</li>
        <li>If flapping persists, consult the exact switch platform documentation for any approved port-protection or flap-suppression controls. Such controls may limit impact but do not replace root-cause diagnosis; do not copy commands across vendors or software releases.</li>
      </ol>
      <h2 id="references">Sources and further reading</h2>
      <ul>
        <li><a href="https://www.cisco.com/c/en/us/support/docs/switches/catalyst-9500-series-switches/218397-troubleshoot-port-flaps-on-catalyst-9000.html" target="_blank" rel="noopener noreferrer">Cisco: Troubleshoot Port Flaps on Catalyst 9000 Switches</a>.</li>
        <li><a href="https://www.intel.com/content/www/us/en/support/articles/000007187/ethernet-products.html" target="_blank" rel="noopener noreferrer">Intel Support: Ethernet cabling specifications</a>.</li>
      </ul>
      <p>CLI syntax, DOM thresholds, transceiver compatibility and port-protection behavior vary by platform and software release. Verify commands and alarm limits in the exact vendor documentation before using them on production equipment.</p>

    `
  },
  {
    slug: 'poweredge-proliant-amber-led-indicator-cheatsheet',
    title: 'PowerEdge & ProLiant Amber Indicator Code Cheatsheet: What Motherboard LEDs Mean in the Field',
    description: 'Field diagnostic reference for Dell PowerEdge iDRAC status codes and HPE ProLiant Systems Insight Display (SID) LEDs, detailing RAM DIMM, PSU, and RAID fault recovery.',
    category: 'Server Hardware & Field Service',
    readTime: '9 min read',
    publishedDate: 'October 20, 2026',
    author: 'Jawed Imtiaz (IT Field Lead)',
    keywords: ['Dell PowerEdge', 'HPE ProLiant', 'iDRAC', 'iLO', 'Amber LED', 'Systems Insight Display', 'RAID Fault'],
    toc: [
      { id: 'overview-leds', text: '1. Understanding Server Health LED Indicators' },
      { id: 'dell-poweredge-matrix', text: '2. Dell PowerEdge iDRAC & Bezel Error Codes' },
      { id: 'hpe-proliant-matrix', text: '3. HPE ProLiant Systems Insight Display (SID) Matrix' },
      { id: 'psu-power-faults', text: '4. Power Supply (PSU) Amber Flash Patterns' },
      { id: 'ram-dimm-isolation', text: '5. Isolating RAM DIMM Faults & Minimum-to-POST' },
      { id: 'field-recovery-steps', text: '6. Field Recovery Protocol & Flea Power Release' }
    ],
    contentHtml: `
      <div className="card" style="border-left: 4px solid var(--amber); background: var(--surface); padding: 18px; margin-bottom: 24px;">
        <strong style="color: var(--amber); font-size: 1.05rem;">⚠️ On-Site Server Diagnostic Protocol</strong>
        <p style="margin: 8px 0 0; font-size: 0.95rem;">
          When called to a data center floor for a degraded enterprise server, front bezel LEDs and internal motherboard fault indicators provide instant hardware failure diagnosis before attaching a KVM console.
        </p>
      </div>

      <h2 id="overview-leds">1. Understanding Server Health LED Indicators</h2>
      <p>
        Enterprise servers utilize multi-color chassis LEDs to signal system state:
      </p>
      <ul>
        <li><strong>Solid Blue / Green:</strong> System powered ON and operating normally.</li>
        <li><strong>Blinking Amber / Yellow:</strong> System degraded (non-critical event, e.g. single redundant PSU lost power, fan failure in redundant array).</li>
        <li><strong>Solid Amber / Blinking Red:</strong> Critical hardware failure (CPU thermal trip, fatal memory uncorrectable ECC error, total RAID volume loss).</li>
      </ul>

      <h2 id="dell-poweredge-matrix">2. Dell PowerEdge iDRAC & Bezel Error Codes</h2>
      <p>
        Dell 14G/15G/16G PowerEdge servers feature a front LED status indicator button and LCD bezel displaying standard SEL event codes:
      </p>

      <div style="overflow-x: auto; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; background: var(--bg-darker); border: 1px solid var(--line);">
          <thead>
            <tr style="background: var(--surface-hover); color: var(--text-heading); text-align: left;">
              <th style="padding: 12px; border: 1px solid var(--line);">iDRAC / LCD Code</th>
              <th style="padding: 12px; border: 1px solid var(--line);">Front Indicator</th>
              <th style="padding: 12px; border: 1px solid var(--line);">Hardware Failure Mode</th>
              <th style="padding: 12px; border: 1px solid var(--line);">Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-family: monospace; font-weight: bold;">MEM0001 / MEM0702</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #fbbf24;">Blinking Amber</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Uncorrectable ECC Memory error on DIMM [X]</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Reseat indicated DIMM. If persistent, replace memory module.</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-family: monospace; font-weight: bold;">PDR1001 / PDR0001</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #f43f5e;">Solid Amber</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Physical Drive fault or removed during rebuild</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Check PERC RAID status; replace failed SAS/NVMe drive.</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-family: monospace; font-weight: bold;">PSU0003 / PSU0006</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #fbbf24;">Blinking Amber</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Power Supply input voltage loss or mismatch</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Verify C13/C14 power cord seated into PDU; replace PSU block.</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid var(--line); font-family: monospace; font-weight: bold;">CPU0001 / CPU0700</td>
              <td style="padding: 10px; border: 1px solid var(--line); color: #f43f5e;">Solid Amber</td>
              <td style="padding: 10px; border: 1px solid var(--line);">CPU Thermal trip or Internal Timer Error (IERR)</td>
              <td style="padding: 10px; border: 1px solid var(--line);">Inspect heatsink thermal paste, fan array, or clear flea power.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="hpe-proliant-matrix">3. HPE ProLiant Systems Insight Display (SID) Matrix</h2>
      <p>
        LED layouts and meanings vary by exact server model, generation, installed options and firmware. The examples below are triage prompts only—not a universal Dell/HPE code map. Confirm the exact model and consult its current service manual and event log before taking hardware action:
      </p>
      <ul>
        <li><strong>Processor LED Amber:</strong> CPU socket fault or thermal shutdown.</li>
        <li><strong>DIMM Slot LED Amber (e.g., Ch A Slot 2):</strong> Specific memory slot degraded or disabled by ROM during POST.</li>
        <li><strong>Over-Temp LED Amber:</strong> Chassis ambient temperature exceeded limit; check intake fan assembly.</li>
        <li><strong>Health LED amber/red:</strong> On some ProLiant models this indicates degraded or critical system health; the exact meaning depends on the model and other indicators. Check the model-specific guide and Integrated Management Log (IML).</li>
      </ul>

      <h2 id="psu-power-faults">4. Power Supply (PSU) Amber Flash Patterns</h2>
      <p>
        Hot-plug Power Supply Units incorporate dedicated status LEDs directly on the handle:
      </p>
      <div style="background: var(--bg-darker); border: 1px solid var(--line); padding: 16px; border-radius: 10px; margin: 16px 0;">
        <ul style="margin-bottom: 0;">
          <li><strong>Off:</strong> No AC power connected to C13/C19 inlet.</li>
          <li><strong>Solid Green:</strong> PSU output active and supplying 12V main power.</li>
          <li><strong>Blinking Green (1Hz):</strong> AC power present, 12V standby active, main server powered off.</li>
          <li><strong>Amber indicator:</strong> Treat as a model-specific fault indication. Check the PSU label/manual and system event log before deciding whether the PSU or another component needs service.</li>
          <li><strong>Blinking or alternating indicator:</strong> Interpret the pattern using the exact PSU model documentation; do not infer firmware-update or input-voltage status from color alone.</li>
        </ul>
      </div>

      <h2 id="ram-dimm-isolation">5. Isolating RAM DIMM Faults & Minimum-to-POST</h2>
      <p>
        A minimum-to-POST configuration is a model-specific service procedure, not a universal checklist. Do not remove CPUs, drives or PCIe cards, or assume that DIMM slot A1 is the correct starting point, unless the exact server maintenance guide specifies those steps.
      </p>
      <ul style="line-height: 1.8;">
        <li>Record the exact model, LED pattern, POST message and management-controller event log before changing hardware.</li>
        <li>Confirm the approved maintenance window, workload impact, backup/restore plan and component-redundancy state.</li>
        <li>Follow the manufacturer procedure for shutdown, power isolation, electrostatic-discharge protection and supported memory population.</li>
        <li>Change one variable at a time and record each observed result; escalate if the next step is not documented for the model or exceeds your authorization.</li>
      </ul>

      <h2 id="field-recovery-steps">6. Field Recovery Protocol & Flea Power Release</h2>
      <p>
        Residual-power release and controller-reset steps vary by model. Do not apply generic button-hold or wait timings. Use the exact Dell or HPE service procedure, verify the system is in an approved maintenance state, and disconnect power only as instructed by the manufacturer. Do not interrupt a firmware update or a protected storage operation.
      </p>
      <h2 id="references">Sources and model-specific service documentation</h2>
      <ul>
        <li><a href="https://www.dell.com/support/manuals/en-in/oth-r260/r260_ism/system-health-and-system-id-indicator-codes?guid=guid-6d47de6d-f69f-4d82-ba9f-51af4e3c6dfe&lang=en-us" target="_blank" rel="noopener noreferrer">Dell PowerEdge R260: System health and system ID indicator codes</a>.</li>
        <li><a href="https://www.dell.com/support/manuals/en-in/poweredge-r740/per740_ism_pub/status-led-indicators?guid=guid-e968effd-8b55-4b6e-abe9-7d95a95407ef&lang=en-us" target="_blank" rel="noopener noreferrer">Dell PowerEdge R740: Status LED indicators</a>.</li>
        <li><a href="https://support.hpe.com/hpesc/public/api/document/a00106496en_us" target="_blank" rel="noopener noreferrer">HPE ProLiant DL380 Gen10: Maintenance and service guide</a>.</li>
        <li><a href="https://www.hpe.com/info/gen11-troubleshooting" target="_blank" rel="noopener noreferrer">HPE: ProLiant Gen11 troubleshooting resources</a>.</li>
      </ul>
      <p>LED combinations and recovery steps are model-specific. Use these references as examples, then select the exact model and generation in the vendor support portal. Do not remove hardware or perform power-release/reset procedures from a generic guide without checking the applicable service manual and approved maintenance process.</p>

    `
  }
];
