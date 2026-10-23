import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { AdUnitPlaceholder } from '../components/AdUnitPlaceholder';

interface DeviceItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  wattsPerUnit: number;
}

const DEFAULT_DEVICES: DeviceItem[] = [
  { id: 'dev-1', name: '1U Rack Servers (Dual Power Supply)', category: 'Server', quantity: 4, wattsPerUnit: 350 },
  { id: 'dev-2', name: '2U Enterprise Database Servers', category: 'Server', quantity: 2, wattsPerUnit: 650 },
  { id: 'dev-3', name: 'Top-of-Rack Network Switches (48-Port PoE+)', category: 'Switch', quantity: 2, wattsPerUnit: 250 },
  { id: 'dev-4', name: 'SAN/NAS Disk Storage Shelf (24-Bay SAS)', category: 'Storage', quantity: 1, wattsPerUnit: 550 },
  { id: 'dev-5', name: 'Firewall & Edge Security Appliances', category: 'Security', quantity: 2, wattsPerUnit: 120 },
];

export const ServerRackPowerBtuCalculator: React.FC = () => {
  const [devices, setDevices] = useState<DeviceItem[]>(DEFAULT_DEVICES);
  const [voltage, setVoltage] = useState<number>(208); // Default 208V High-Density Data Center
  const [powerFactor, setPowerFactor] = useState<number>(0.95);
  const [safetyMargin, setSafetyMargin] = useState<number>(20); // 20% Growth & Headroom
  const [electricityCostRate, setElectricityCostRate] = useState<number>(0.14); // $0.14 per kWh average
  const [hoursPerDay, setHoursPerDay] = useState<number>(24);

  // New Custom Device state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Server');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newWatts, setNewWatts] = useState(300);

  const handleDeviceChange = (id: string, field: 'quantity' | 'wattsPerUnit', value: number) => {
    setDevices(prev =>
      prev.map(d => (d.id === id ? { ...d, [field]: Math.max(0, value) } : d))
    );
  };

  const handleRemoveDevice = (id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
  };

  const handleAddCustomDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newItem: DeviceItem = {
      id: `dev-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      quantity: Math.max(1, newQuantity),
      wattsPerUnit: Math.max(1, newWatts),
    };
    setDevices(prev => [...prev, newItem]);
    setNewName('');
    setNewQuantity(1);
    setNewWatts(300);
  };

  // Calculations
  const calc = useMemo(() => {
    const rawWatts = devices.reduce((sum, d) => sum + d.quantity * d.wattsPerUnit, 0);
    const marginMultiplier = 1 + safetyMargin / 100;
    const designWatts = Math.round(rawWatts * marginMultiplier);
    const designKilowatts = designWatts / 1000;

    // Apparent Power (VA) = Watts / Power Factor
    const apparentPowerVa = Math.round(designWatts / powerFactor);

    // Amperage Draw: Single-Phase Current (I) = Watts / (Volts * PF)
    const currentAmpsRaw = designWatts / (voltage * powerFactor);
    const currentAmps = parseFloat(currentAmpsRaw.toFixed(2));

    // NEC 80% Continuous Load Safety Rule (Breaker Rating = Amps / 0.80)
    const minBreakerRatingAmps = Math.ceil(currentAmpsRaw / 0.80);

    // Thermal Output: 1 Watt = 3.41214 BTU/hr
    const btuPerHourRaw = rawWatts * 3.41214;
    const btuPerHourDesign = designWatts * 3.41214;

    const btuPerHour = Math.round(btuPerHourRaw);
    const btuPerHourDesignRounded = Math.round(btuPerHourDesign);

    // Tons of Refrigeration (1 Ton = 12,000 BTU/hr)
    const coolingTons = parseFloat((btuPerHourDesign / 12000).toFixed(2));

    // Daily & Monthly kWh
    const dailyKwh = (rawWatts / 1000) * hoursPerDay;
    const monthlyKwh = dailyKwh * 30.5;
    const monthlyCost = monthlyKwh * electricityCostRate;

    // PDU Recommendation Logic
    let pduRec = '20A 120V NEMA L5-20P';
    if (voltage === 208) {
      if (minBreakerRatingAmps <= 20) pduRec = '20A 208V NEMA L6-20P or IEC C13/C19';
      else if (minBreakerRatingAmps <= 30) pduRec = '30A 208V NEMA L6-30P PDU';
      else pduRec = '3-Phase 30A 208V NEMA L21-30P or Dual 30A PDUs';
    } else if (voltage === 240 || voltage === 230) {
      pduRec = '16A/32A 230V IEC 60309 PDU';
    } else {
      if (minBreakerRatingAmps <= 15) pduRec = '15A 120V NEMA 5-15P';
      else if (minBreakerRatingAmps <= 20) pduRec = '20A 120V NEMA L5-20P';
      else pduRec = '30A 120V NEMA L5-30P or Dual 20A PDUs';
    }

    return {
      rawWatts,
      designWatts,
      designKilowatts,
      apparentPowerVa,
      currentAmps,
      minBreakerRatingAmps,
      btuPerHour,
      btuPerHourDesignRounded,
      coolingTons,
      dailyKwh: parseFloat(dailyKwh.toFixed(2)),
      monthlyKwh: Math.round(monthlyKwh),
      monthlyCost: parseFloat(monthlyCost.toFixed(2)),
      pduRec,
    };
  }, [devices, voltage, powerFactor, safetyMargin, electricityCostRate, hoursPerDay]);

  return (
    <main className="container page">

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Tools', href: '/tools' },
            { label: 'Server Rack Power & BTU Calculator' },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title="Server Rack Power & BTU Calculator"
          text="Estimate server equipment electrical draw (Watts/Amps), circuit breaker derating, and HVAC BTU/hr cooling load."
        />
      </div>

      {/* Top Leaderboard Ad Unit */}
      <AdUnitPlaceholder slotType="top-leaderboard" />

      <p className="eyebrow">Diagnostic Tool — Data Center Infrastructure</p>
      <h1>Server Rack Power &amp; BTU Calculator</h1>
      <p className="lead">
        Calculate total IT equipment electrical power load (Watts/kW), circuit amperage draw (Amps), NEC 80% continuous load circuit derating, heat dissipation in BTU/hr, and HVAC cooling capacity in Tons of Refrigeration.
      </p>

      {/* Calculator Container */}
      <div className="card" style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--line)', marginBottom: '36px' }}>
        {/* Environmental Parameters Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--line)' }}>
          <div className="form-field">
            <label htmlFor="voltage-select" style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>
              Supply Voltage (V)
            </label>
            <select
              id="voltage-select"
              value={voltage}
              onChange={e => setVoltage(parseInt(e.target.value, 10))}
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem' }}
            >
              <option value={120}>120V AC (Standard US Wall Outlet / PDU)</option>
              <option value={208}>208V AC (High-Density Enterprise Data Center)</option>
              <option value={230}>230V AC (EU / International Standard)</option>
              <option value={240}>240V AC (US Commercial High Voltage)</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="pf-select" style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>
              Power Factor (PF)
            </label>
            <select
              id="pf-select"
              value={powerFactor}
              onChange={e => setPowerFactor(parseFloat(e.target.value))}
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem' }}
            >
              <option value={0.95}>0.95 — Active PFC Server Power Supply (Recommended)</option>
              <option value={0.90}>0.90 — Standard Network Switches &amp; Routers</option>
              <option value={0.80}>0.80 — Legacy Power Supplies / Motors</option>
              <option value={1.00}>1.00 — Unity Power Factor (Pure Resistance)</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="margin-select" style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>
              Growth &amp; Safety Margin
            </label>
            <select
              id="margin-select"
              value={safetyMargin}
              onChange={e => setSafetyMargin(parseInt(e.target.value, 10))}
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem' }}
            >
              <option value={0}>0% — Exact Nameplate Sum</option>
              <option value={10}>10% — Modest Margin</option>
              <option value={20}>20% — Standard Data Center Headroom (Recommended)</option>
              <option value={30}>30% — High Expansion Allowance</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="cost-rate" style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>
              Electricity Cost ($/kWh)
            </label>
            <input
              id="cost-rate"
              type="number"
              step="0.01"
              value={electricityCostRate}
              onChange={e => setElectricityCostRate(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        {/* Device Inventory List */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-heading)', marginBottom: '12px' }}>
            🖥️ Server Rack Equipment Inventory
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-darker)', border: '1px solid var(--line)', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-hover)', color: 'var(--text-heading)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', border: '1px solid var(--line)' }}>Equipment Name</th>
                  <th style={{ padding: '10px 12px', border: '1px solid var(--line)' }}>Category</th>
                  <th style={{ padding: '10px 12px', border: '1px solid var(--line)', width: '110px' }}>Quantity</th>
                  <th style={{ padding: '10px 12px', border: '1px solid var(--line)', width: '140px' }}>Watts / Unit</th>
                  <th style={{ padding: '10px 12px', border: '1px solid var(--line)', width: '130px' }}>Subtotal Watts</th>
                  <th style={{ padding: '10px 12px', border: '1px solid var(--line)', width: '80px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(dev => (
                  <tr key={dev.id}>
                    <td style={{ padding: '8px 12px', border: '1px solid var(--line)', fontWeight: 500 }}>{dev.name}</td>
                    <td style={{ padding: '8px 12px', border: '1px solid var(--line)' }}>
                      <span className="badge" style={{ fontSize: '0.75rem' }}>{dev.category}</span>
                    </td>
                    <td style={{ padding: '8px 12px', border: '1px solid var(--line)' }}>
                      <input
                        type="number"
                        min="0"
                        value={dev.quantity}
                        onChange={e => handleDeviceChange(dev.id, 'quantity', parseInt(e.target.value, 10) || 0)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: '0.875rem' }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', border: '1px solid var(--line)' }}>
                      <input
                        type="number"
                        min="0"
                        value={dev.wattsPerUnit}
                        onChange={e => handleDeviceChange(dev.id, 'wattsPerUnit', parseInt(e.target.value, 10) || 0)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: '0.875rem' }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', border: '1px solid var(--line)', fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                      {(dev.quantity * dev.wattsPerUnit).toLocaleString()} W
                    </td>
                    <td style={{ padding: '8px 12px', border: '1px solid var(--line)', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveDevice(dev.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontSize: '1rem' }}
                        title="Delete device"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Custom Device Form */}
          <form onSubmit={handleAddCustomDevice} style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-darker)', border: '1px solid var(--line)', borderRadius: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 2, minWidth: '180px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Add Equipment Name</label>
              <input
                type="text"
                placeholder="e.g. 4U GPU AI Inference Node"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '110px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Category</label>
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ width: '100%', padding: '6px 10px', fontSize: '0.85rem' }}>
                <option value="Server">Server</option>
                <option value="Switch">Switch</option>
                <option value="Storage">Storage</option>
                <option value="Security">Security</option>
                <option value="PDU/UPS">PDU/UPS</option>
              </select>
            </div>

            <div style={{ width: '90px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Qty</label>
              <input
                type="number"
                min="1"
                value={newQuantity}
                onChange={e => setNewQuantity(parseInt(e.target.value, 10) || 1)}
                style={{ width: '100%', padding: '6px 10px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ width: '110px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Watts/Unit</label>
              <input
                type="number"
                min="1"
                value={newWatts}
                onChange={e => setNewWatts(parseInt(e.target.value, 10) || 1)}
                style={{ width: '100%', padding: '6px 10px', fontSize: '0.85rem' }}
              />
            </div>

            <button type="submit" className="button button-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
              + Add Device
            </button>
          </form>
        </div>

        {/* Power & BTU Output Dashboard */}
        <div style={{ paddingTop: '20px', borderTop: '2px solid var(--line)' }}>
          <h3 style={{ color: 'var(--text-heading)', fontSize: '1.2rem', marginBottom: '16px' }}>
            ⚡ Calculated Power &amp; Thermal Metrics
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ background: 'var(--bg-darker)', border: '1px solid var(--line)', padding: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Total Active Power</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--accent)', display: 'block', margin: '4px 0', fontVariantNumeric: 'tabular-nums' }}>
                {calc.designWatts.toLocaleString()} Watts
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                ({calc.designKilowatts.toFixed(2)} kW design load including {safetyMargin}% headroom)
              </span>
            </div>

            <div className="card" style={{ background: 'var(--bg-darker)', border: '1px solid var(--line)', padding: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Current Draw @ {voltage}V</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--emerald)', display: 'block', margin: '4px 0', fontVariantNumeric: 'tabular-nums' }}>
                {calc.currentAmps} Amps
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Apparent Power: {calc.apparentPowerVa.toLocaleString()} VA
              </span>
            </div>

            <div className="card" style={{ background: 'var(--bg-darker)', border: '1px solid var(--line)', padding: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Thermal Dissipation</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--amber)', display: 'block', margin: '4px 0', fontVariantNumeric: 'tabular-nums' }}>
                {calc.btuPerHourDesignRounded.toLocaleString()} BTU/hr
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Base Equipment: {calc.btuPerHour.toLocaleString()} BTU/hr
              </span>
            </div>

            <div className="card" style={{ background: 'var(--bg-darker)', border: '1px solid var(--line)', padding: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Required HVAC Capacity</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--teal)', display: 'block', margin: '4px 0', fontVariantNumeric: 'tabular-nums' }}>
                {calc.coolingTons} Tons
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                (1 Ton = 12,000 BTU/hr CRAC/CRAH)
              </span>
            </div>
          </div>

          {/* Infrastructure Specifications Box */}
          <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--line)', padding: '18px', borderRadius: '10px' }}>
            <h4 style={{ margin: '0 0 12px', color: 'var(--text-heading)', fontSize: '0.95rem' }}>
              🔌 Electrical Infrastructure &amp; Operating Cost Recommendations
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', fontSize: '0.875rem' }}>
              <div>
                <strong style={{ color: 'var(--muted)', display: 'block' }}>Min Circuit Breaker (NEC 80% Rule):</strong>
                <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1rem', fontFamily: 'monospace' }}>
                  {calc.minBreakerRatingAmps} Amp Dedicated Circuit
                </span>
              </div>

              <div>
                <strong style={{ color: 'var(--muted)', display: 'block' }}>Recommended Rack PDU Specification:</strong>
                <span style={{ color: 'var(--emerald)', fontWeight: 600, fontSize: '0.95rem' }}>
                  {calc.pduRec}
                </span>
              </div>

              <div>
                <strong style={{ color: 'var(--muted)', display: 'block' }}>Estimated Monthly Energy Cost:</strong>
                <span style={{ color: 'var(--text-heading)', fontWeight: 600, fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' }}>
                  ${calc.monthlyCost.toFixed(2)} / month ({calc.monthlyKwh.toLocaleString()} kWh)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Educational Prose & Technical Principles */}
      <section className="content-section" style={{ borderTop: '2px solid var(--line)', paddingTop: '32px' }}>
        <h2>Server Rack Electrical Sizing &amp; Thermal Management Principles</h2>
        <p>
          Every Watt of electrical power consumed by server CPUs, RAM DIMMs, hard drives, and power supply losses is converted almost entirely into thermal energy according to the First Law of Thermodynamics.
        </p>

        <h3>1. The 3.41214 BTU/hr Thermal Dissipation Constant</h3>
        <p>
          The standard physical conversion rate between electrical power and thermal heat output is:
        </p>
        <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--line)', padding: '14px', borderRadius: '8px', fontFamily: 'monospace', color: 'var(--accent)', margin: '12px 0' }}>
          Thermal Output (BTU/hr) = Power (Watts) × 3.41214
        </div>
        <p>
          A British Thermal Unit (BTU) is defined as the amount of heat energy required to raise the temperature of one pound of water by 1°F at sea level. In data center cooling design, 12,000 BTU/hr equals 1 Ton of Refrigeration capacity in CRAC (Computer Room Air Conditioning) or CRAH (Computer Room Air Handler) units.
        </p>

        <h3>2. Electrical Sizing &amp; National Electrical Code (NEC) 80% Rule</h3>
        <p>
          Under National Electrical Code (NEC Article 210.20), server racks operate as <strong>continuous loads</strong> (defined as any load operating continuously for 3 hours or more).
        </p>
        <div className="card" style={{ background: 'var(--surface)', borderLeft: '4px solid var(--amber)', padding: '16px', margin: '16px 0' }}>
          <strong style={{ color: 'var(--amber)' }}>Continuous Load Safety Derating (80% Rule)</strong>
          <p style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>
            A standard 20 Amp circuit breaker must not be loaded continuously above 80% of its nominal capacity (maximum <strong>16 Amps continuous draw</strong>). If an IT rack draws 18 Amps continuously at 120V, it requires upgrading to a 30 Amp circuit or splitting the load across dual 20A PDUs.
          </p>
        </div>

        <h3>3. Single-Phase vs Three-Phase Power Formulas</h3>
        <ul>
          <li><strong>Single-Phase Power:</strong> <code>P = V × I × PF</code> (where <code>P</code> is Watts, <code>V</code> is Volts, <code>I</code> is Amps, and <code>PF</code> is Power Factor).</li>
          <li><strong>Three-Phase Power (Line-to-Line):</strong> <code>P = √3 × V × I × PF ≈ 1.732 × V × I × PF</code>. Three-phase PDUs allow balanced current distribution across three phase legs (L1, L2, L3), reducing cable thickness and thermal loss in dense server rooms.</li>
        </ul>

        <h3>4. Data Center Airflow Optimization (Hot Aisle / Cold Aisle Containment)</h3>
        <p>
          Modern high-density server racks (drawing &gt;5 kW per cabinet) require strict separation of cold intake supply air (typically maintained at 68°F to 75°F / 20°C to 24°C under ASHRAE TC 9.9 thermal guidelines) from hot server exhaust air (typically 95°F to 110°F).
        </p>
        <p>
          Utilizing rigid hot-aisle containment (HAC) or cold-aisle containment (CAC) prevents hot exhaust recirculation, reducing overall facility Power Usage Effectiveness (PUE) from historical 2.0 averages down to modern 1.2 to 1.3 enterprise standards.
        </p>
      </section>
    </main>
  );
};
