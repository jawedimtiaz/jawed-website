import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import {
  Timer,
  Play,
  Square,
  RotateCcw,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  BookmarkCheck,
  Trash2,
  ChevronDown,
  ChevronUp,
  Zap,
  Shuffle,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';

export type DifficultyLevel = 'All' | 'Beginner' | 'Intermediate' | 'Advanced';

interface QuestionItem {
  id: string;
  q: string;
  category: 'Core Knowledge' | 'Troubleshooting' | 'Scenario' | 'Process';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  complexity: number; // Scale 1 - 10 (Questions > 5 are advanced scenarios)
  points: string[];
}

type RoleName =
  | 'Help desk / service desk'
  | 'Field technician'
  | 'Network engineer'
  | 'System administrator'
  | 'Cloud / DevOps'
  | 'Security'
  | 'Behavioural (any role)';

const QUESTION_BANK: Record<RoleName, QuestionItem[]> = {
  'Help desk / service desk': [
    {
      id: 'hd-1',
      q: 'A user calls stating they cannot log into their computer on Monday morning. How do you troubleshoot?',
      category: 'Troubleshooting',
      difficulty: 'Beginner',
      complexity: 3,
      points: [
        'Confirm identity and determine scope: is this isolated to one user or affecting the whole department?',
        'Inspect account state in Active Directory / Azure AD: check for locked out, disabled, or expired password status',
        'Verify physical and basic factors: caps lock, num lock, VPN connectivity, keyboard layout, and correct domain prefix',
        'Perform secure password reset or unlock following company verification policy',
        'Stay on the line to confirm successful login, test network drive/mail access, and document the ticket with resolution steps',
      ],
    },
    {
      id: 'hd-2',
      q: 'What is the functional difference between a hub, a switch, and a router?',
      category: 'Core Knowledge',
      difficulty: 'Beginner',
      complexity: 4,
      points: [
        'Hub operates at OSI Layer 1 (Physical) and repeats incoming electrical signals to every connected port (high collision domain)',
        'Switch operates primarily at Layer 2 (Data Link) and forwards frames intelligently based on hardware MAC addresses',
        'Router operates at Layer 3 (Network) and routes packets between distinct IP subnets and WANs using IP routing tables',
        'Modern enterprise environments use managed Layer 2/3 switches with VLAN segmentation and hardware routing',
      ],
    },
    {
      id: 'hd-4',
      q: 'When and how do you escalate a service desk ticket?',
      category: 'Process',
      difficulty: 'Beginner',
      complexity: 4,
      points: [
        'Escalate when technical troubleshooting exceeds Tier 1 scope, permissions, or SLA thresholds',
        'Escalate immediately for suspected cybersecurity incidents (ransomware, phishing compromise) or widespread P1 outages',
        'Document all attempted steps, specific error codes, device hostname, IP, and contact history before hand-off',
        'Notify the higher tier (SysAdmin, Network, Security) per documented escalation SOP and notify user of the hand-off',
      ],
    },
    {
      id: 'hd-11',
      q: 'What architectural steps do you follow when provisioning role-based permissions and hardware for an enterprise new hire?',
      category: 'Process',
      difficulty: 'Beginner',
      complexity: 4,
      points: [
        'Review HR provisioning ticket for job title, manager, cost center, department, and software entitlements',
        'Provision directory accounts (Active Directory / Entra ID) using RBAC security groups rather than copying random user accounts',
        'Assign proper Microsoft 365 licensing, shared mailbox delegates, and file share security groups',
        'Deploy endpoint via Intune Autopilot / standard golden image, confirming BitLocker, EDR agent, and VPN certificates install',
        'Verify initial temporary password requires change on first logon and provide MFA enrollment instructions',
      ],
    },
    {
      id: 'hd-13',
      q: 'A user states they cannot open PDF attachments received via email. How do you troubleshoot the file association?',
      category: 'Troubleshooting',
      difficulty: 'Beginner',
      complexity: 3,
      points: [
        'Verify default app association in Windows Settings (Default Apps by file type -> .pdf)',
        'Check if Adobe Acrobat Reader or corporate PDF viewer is installed and up to date',
        'Test opening the PDF in Edge or Chrome browser to determine if file is corrupted or app-specific',
        'Verify Outlook attachment blocking policies and antivirus real-time shield status',
        'Confirm the user can open local sample PDFs without error',
      ],
    },
    {
      id: 'hd-3',
      q: 'How do you handle an extremely angry or panicked user whose presentation or deadline is at risk?',
      category: 'Scenario',
      difficulty: 'Intermediate',
      complexity: 5,
      points: [
        'Listen actively without interrupting, letting them vent and explaining what you understand',
        'Validate their frustration and acknowledge the direct business impact of the outage',
        'De-escalate with calm tone, project ownership of the issue, and provide a clear, realistic timeframe for the next update',
        'Prioritize temporary workarounds (e.g. loaner laptop, guest credentials) if immediate root cause resolution is prolonged',
        'Follow up proactively once resolved to ensure full satisfaction and prevent recurring anxiety',
      ],
    },
    {
      id: 'hd-5',
      q: 'Explain DHCP and DNS. What does it mean if a user can ping an IP address (e.g. 8.8.8.8) but cannot reach website names (e.g. google.com)?',
      category: 'Core Knowledge',
      difficulty: 'Intermediate',
      complexity: 5,
      points: [
        'DHCP automatically assigns dynamic IP configurations (IP, subnet mask, default gateway, DNS servers) via DORA',
        'DNS translates human-readable domain names (FQDN) into machine-routable IP addresses',
        'Successful ping to an IP confirms Layer 1-3 network connectivity and functional gateway routing',
        'Failure to ping domain names indicates a DNS resolution failure (wrong DNS server, cache poisoning, port 53 blocked)',
        'Troubleshoot using ipconfig /flushdns, nslookup, or checking adapter IPv4 DNS server assignments',
      ],
    },
    {
      id: 'hd-8',
      q: 'An entire departmental floor cannot print to a network multifunction copier showing "Offline". How do you isolate and resolve the print queue breakdown?',
      category: 'Troubleshooting',
      difficulty: 'Intermediate',
      complexity: 6, // > 5
      points: [
        'Check physical printer connectivity: verify IP link light, static IP ping response, and embedded web server (EWS) accessibility',
        'Inspect the corporate Print Server: check the print queue for a bloated or corrupted spool file (e.g. 500MB PDF) locking all jobs',
        'Safely stop the Print Spooler service, purge stale .SHD and .SPL files from C:\\Windows\\System32\\spool\\PRINTERS, and restart spooler',
        'Verify Standard TCP/IP Port configuration: confirm RAW 9100 port settings and disable SNMP Status Enabled if falsely reporting offline',
        'Send a raw text test page directly from server to verify end-to-end driver communication before notifying users',
      ],
    },
    {
      id: 'hd-14',
      q: 'A corporate laptop fails to authenticate to 802.1X enterprise Wi-Fi following a user password change. What do you inspect?',
      category: 'Troubleshooting',
      difficulty: 'Intermediate',
      complexity: 6, // > 5
      points: [
        'Forget the saved network profile in Windows/macOS to force the OS to discard stale cached PEAP-MSCHAPv2 credentials',
        'Inspect user device machine or user certificate if EAP-TLS certificate-based authentication is enforced',
        'Verify client system time and date: skewed clock prevents RADIUS / Kerberos handshake',
        'Check NPS (Network Policy Server) or Cisco ISE RADIUS logs for rejected authentication attempts and specific reason codes',
        'Verify computer object is healthy in Active Directory and domain trust relationship is intact',
      ],
    },
    {
      id: 'hd-6',
      q: 'A user encounters an intermittent Windows Blue Screen of Death (BSOD) with Stop Code KERNEL_DATA_INPAGE_ERROR. Walk me through your in-depth diagnostic approach.',
      category: 'Troubleshooting',
      difficulty: 'Advanced',
      complexity: 8, // > 5
      points: [
        'Recognize KERNEL_DATA_INPAGE_ERROR as failure of Windows kernel to page memory from disk (paging file or physical storage fault)',
        'Boot into WinRE / Safe Mode; inspect minidump files with WinDbg or BlueScreenView to isolate the specific driver or NTFS subsystem error',
        'Check physical drive integrity: inspect S.M.A.R.T. health attributes, run chkdsk /f /r to locate bad blocks, and test drive controller cabling',
        'Run Windows Memory Diagnostic (mdsched.exe) or MemTest86 to rule out faulty RAM blocks preventing paging',
        'Perform DISM /Online /Cleanup-Image /RestoreHealth and sfc /scannow to repair corrupted Windows core system files',
      ],
    },
    {
      id: 'hd-7',
      q: 'A remote executive reports Outlook intermittently displays "Disconnected" and repeatedly rejects modern authentication prompts. How do you resolve it?',
      category: 'Troubleshooting',
      difficulty: 'Advanced',
      complexity: 7, // > 5
      points: [
        'Verify user network path: check if corporate VPN split-tunneling is interfering with Microsoft 365 cloud endpoints',
        'Check Windows Credential Manager: clear corrupted ADAL/WAM cached tokens under Generic Credentials',
        'Inspect Microsoft Entra ID (Azure AD) sign-in logs: review Conditional Access policy blocks, compliant device state, and MFA failures',
        'Test modern authentication subsystem via registry or reset Microsoft Identity WAM broker plugin packages in AppData',
        'Recreate the Outlook mail profile from scratch with a fresh OST cache, verifying Autodiscover DNS records',
      ],
    },
    {
      id: 'hd-9',
      q: 'A user locked out of a BitLocker-encrypted laptop requests an emergency recovery key over the phone. What security and verification steps do you execute?',
      category: 'Scenario',
      difficulty: 'Advanced',
      complexity: 7, // > 5
      points: [
        'Enforce strict out-of-band identity verification to prevent social engineering (calling user back on HR-verified company phone)',
        'Require the user to read the unique 32-character BitLocker Recovery Key ID displayed on screen',
        'Query the matching key ID in Microsoft Entra ID (Azure AD), Intune, or Active Directory BitLocker Recovery tab',
        'Carefully dictate the 48-digit numerical key in 6-digit blocks and confirm successful drive unlock into Windows',
        'Investigate trigger cause (recent BIOS/UEFI firmware upgrade, altered Secure Boot keys, TPM failure, or docking hardware change)',
      ],
    },
    {
      id: 'hd-10',
      q: 'A critical workstation exhibits sustained 100% disk utilization and thermal throttling. How do you systematically isolate and remediate the bottleneck?',
      category: 'Troubleshooting',
      difficulty: 'Advanced',
      complexity: 8, // > 5
      points: [
        'Open Resource Monitor and sort Disk Activity by Total (B/sec) and Response Time (ms) rather than simple percentage',
        'Identify culprit process: Windows Search indexing loop, Antivirus continuous scanning, TiWorker.exe update installation, or telemetry',
        'Check drive queue depth and response times (> 100ms indicates severe storage bottleneck or failing SSD controller)',
        'Inspect Event Viewer for disk bad block warnings (Event ID 7 / 51) and verify AHCI/NVMe controller driver updates',
        'Apply targeted fix (rebuild index, add AV folder exclusions, restart Windows Update services, or schedule drive replacement)',
      ],
    },
    {
      id: 'hd-12',
      q: 'A project manager inadvertently deletes a business-critical folder from an SMB network share without a local Recycle Bin. How do you recover it?',
      category: 'Troubleshooting',
      difficulty: 'Advanced',
      complexity: 7, // > 5
      points: [
        'Explain that SMB network share deletions bypass the local client Recycle Bin',
        'Inspect Volume Shadow Copies (VSS / Previous Versions) on the Windows File Server by checking the parent directory properties',
        'If VSS is stale or insufficient, access enterprise backup repository (e.g. Veeam, Datto, Commvault) to locate latest point-in-time snapshot',
        'Restore the folder to an alternate staging path to prevent accidental overwrites of files modified by coworkers since deletion',
        'Verify NTFS permissions inheritance on restored files and validate data integrity with the project manager',
      ],
    },
  ],
  'Field technician': [
    {
      id: 'ft-2',
      q: 'What is the structural difference between straight-through and crossover cables, and why are crossover cables rarely needed today?',
      category: 'Core Knowledge',
      difficulty: 'Beginner',
      complexity: 3,
      points: [
        'Straight-through cables terminate identical wiring standards on both ends (T568A to T568A or T568B to T568B)',
        'Crossover cables cross the transmit and receive pairs (T568A on one end, T568B on the other end)',
        'Historically used for like-device connections (switch-to-switch, PC-to-PC) to prevent TX/RX collisions',
        'Modern network interfaces feature Auto-MDIX (Medium Dependent Interface Crossover) which automatically detects and swaps pairs',
      ],
    },
    {
      id: 'ft-3',
      q: 'How do you prioritize and coordinate multiple dispatched dispatch tickets across different geographical sites?',
      category: 'Process',
      difficulty: 'Beginner',
      complexity: 4,
      points: [
        'Sort by enterprise business impact (critical site offline vs single non-blocking workstation issue)',
        'Consider SLA deadlines, contract penalties, and business operating hours for each facility',
        'Plan efficient travel routes to minimize transit time, ensuring necessary spare parts and tools are in vehicle',
        'Communicate estimated time of arrival (ETA) to local site contacts before departure and when delayed',
      ],
    },
    {
      id: 'ft-4',
      q: 'What Electrostatic Discharge (ESD) and physical safety practices do you strictly adhere to when servicing hardware?',
      category: 'Core Knowledge',
      difficulty: 'Beginner',
      complexity: 4,
      points: [
        'Use an anti-static wrist strap clipped to unpainted chassis ground or work on an ESD grounding mat',
        'Always power down systems, disconnect dual redundant power cords, and discharge capacitors by holding power button',
        'Practice safe lifting technique for heavy servers, using team lifts or server lifts for units over 40 lbs',
        'Maintain clean cable management in racks to prevent snagging, trip hazards, or airflow blockage',
      ],
    },
    {
      id: 'ft-1',
      q: 'A network switch or peripheral device at a remote office site is reported completely offline. What is your physical inspection routine?',
      category: 'Troubleshooting',
      difficulty: 'Intermediate',
      complexity: 5,
      points: [
        'Check physical power: examine AC power cord, PDU outlet breaker, and device power supply LEDs',
        'Examine switch port status link LEDs: amber, green, unlit, or flashing collision indicators',
        'Test Ethernet patch cables using a known-working cable or tone/continuity cable tester',
        'Connect via serial console cable (RJ45-to-DB9/USB) to observe boot loop, POST error, or crash dump messages',
        'Document serial numbers, rack location, and port patch schedule before leaving site',
      ],
    },
    {
      id: 'ft-5',
      q: 'How do you certify and document a newly punched down Cat6 structured cable run using an enterprise certifier (e.g. Fluke DSX)?',
      category: 'Process',
      difficulty: 'Intermediate',
      complexity: 7, // > 5
      points: [
        'Inspect punchdown keystone jack: verify T568B color coding, minimal untwist of pairs (< 0.5 inch), and clean trim',
        'Use an industry cable certifier (e.g. Fluke DSX) to test wiremap, length, insertion loss, NEXT (Near-End Crosstalk), and return loss',
        'Verify the run does not exceed the 100-meter (90m solid + 10m patch) standard specification limit',
        'Label both ends: faceplate jack ID matching the patch panel port ID (e.g. Rack A - PP1 - Port 24)',
        'Save certification test results and update the site cabling elevation and floor plan documentation',
      ],
    },
    {
      id: 'ft-6',
      q: 'A newly installed Power over Ethernet (PoE) security camera or access point repeatedly boots, cycles, and disconnects. What do you check?',
      category: 'Troubleshooting',
      difficulty: 'Advanced',
      complexity: 8, // > 5
      points: [
        'Check the PoE budget on the switch stack: ensure total wattage has not exceeded the switch power supply capacity',
        'Check PoE standard requirement: verify if the device requires 802.3af (15.4W), 802.3at PoE+ (30W), or 802.3bt (60W+)',
        'Test cable run resistance and length: long or subpar copper-clad aluminum (CCA) cables suffer severe DC voltage drop',
        'Inspect RJ45 crimp for bent pins or poor contact on pairs 4-5 and 7-8 used for power delivery',
        'Test the device on a local switch port with a short, factory-certified patch cord to isolate field cabling',
      ],
    },
    {
      id: 'ft-7',
      q: 'A multi-mode fiber optic backbone uplink between two server closets shows high optical packet loss. Walk through your inspection protocol.',
      category: 'Troubleshooting',
      difficulty: 'Advanced',
      complexity: 9, // > 5
      points: [
        'Inspect SFP+ transceivers on both switches: check Digital Optical Monitoring (DOM) Rx and Tx optical power levels in dBm',
        'Check fiber patch cords with a visual fault locator (VFL red laser) to detect micro-bends or sheath breaks',
        'Use a fiber inspection microscope to check LC connector ferrules for dust, oil, or scratches',
        'Clean ferrules using a dry one-click fiber cleaner or lint-free IPA wipes, never reconnecting dirty fiber',
        'If attenuation persists, run an Optical Time-Domain Reflectometer (OTDR) to identify exact splice or patch panel faults',
      ],
    },
  ],
  'Network engineer': [
    {
      id: 'net-1',
      q: 'Map the OSI 7-layer model to modern network infrastructure equipment and data units.',
      category: 'Core Knowledge',
      difficulty: 'Beginner',
      complexity: 4,
      points: [
        'Layer 1 (Physical): Hubs, cables, transceivers, bit transmission',
        'Layer 2 (Data Link): Managed switches, wireless access points; frames, MAC addresses, VLANs (802.1Q)',
        'Layer 3 (Network): Routers, Layer 3 switches; packets, IP addressing, ICMP, routing protocols (OSPF, BGP)',
        'Layer 4 (Transport): End-to-end communication; TCP segments (ports, reliability, handshakes), UDP datagrams',
        'Layers 5-7 (Application): Firewalls, load balancers, proxies; HTTP/HTTPS, DNS, SSH, SSL/TLS encryption',
      ],
    },
    {
      id: 'net-5',
      q: 'Compare TCP versus UDP. Give real-world enterprise examples where each protocol is appropriate.',
      category: 'Core Knowledge',
      difficulty: 'Beginner',
      complexity: 4,
      points: [
        'TCP: Connection-oriented, 3-way handshake (SYN, SYN-ACK, ACK), guaranteed delivery, sequencing, retransmission',
        'UDP: Connectionless, lightweight, low-overhead, no acknowledgment or flow control',
        'TCP use cases: Web (HTTP/HTTPS), file transfer (SFTP), email (SMTP/IMAP), SSH, database connections',
        'UDP use cases: VoIP (SIP/RTP), DNS queries, video streaming, DHCP, NTP, online gaming',
      ],
    },
    {
      id: 'net-3',
      q: 'Walk through the 4-step DHCP exchange process (DORA) and explain potential points of failure.',
      category: 'Core Knowledge',
      difficulty: 'Intermediate',
      complexity: 5,
      points: [
        'Discover: Client broadcasts DHCPDISCOVER to find available DHCP servers on the subnet',
        'Offer: DHCP server responds with unicast/broadcast DHCPOFFER containing IP, subnet, gateway, lease time',
        'Request: Client broadcasts DHCPREQUEST accepting one offer and implicitly declining others',
        'Acknowledge: Server sends DHCPACK finalizing the lease registration in its binding table',
        'Common failures: IP scope exhaustion, rogue DHCP server, or missing IP Helper / DHCP Relay on Layer 3 gateway',
      ],
    },
    {
      id: 'net-2',
      q: 'What is a VLAN and why is it used? How does traffic pass between two different VLANs across an 802.1Q trunk?',
      category: 'Core Knowledge',
      difficulty: 'Intermediate',
      complexity: 6, // > 5
      points: [
        'Logical isolation of broadcast domains on shared physical switch hardware',
        'Improves network security, optimizes bandwidth by bounding broadcast storms, and isolates departmental traffic',
        'Trunk ports use IEEE 802.1Q tagging to carry multiple VLAN frames across switches by inserting a 4-byte VLAN ID tag',
        'Inter-VLAN routing requires a Layer 3 device (Router-on-a-Stick or Switched Virtual Interfaces / SVIs on a L3 switch)',
        'Access control lists (ACLs) or firewalls inspect and filter inter-VLAN communications',
      ],
    },
    {
      id: 'net-4',
      q: 'A user cannot load an external intranet website. How do you isolate the network path systematically?',
      category: 'Troubleshooting',
      difficulty: 'Intermediate',
      complexity: 6, // > 5
      points: [
        'Verify local network config: check IP, subnet mask, and default gateway using ipconfig/ifconfig',
        'Ping local default gateway to confirm Layer 2 switch connectivity and ARP resolution',
        'Ping an external known IP (e.g. 1.1.1.1 or gateway WAN) to confirm Layer 3 routing and NAT translation',
        'Test DNS resolution using nslookup or dig to confirm domain resolves to the correct IP',
        'Run traceroute / mtr to pinpoint the exact hop where latency or packet drops occur; inspect firewall policies',
      ],
    },
    {
      id: 'net-6',
      q: 'What is Spanning Tree Protocol (STP), and what happens if a switching loop occurs on an enterprise LAN?',
      category: 'Core Knowledge',
      difficulty: 'Advanced',
      complexity: 8, // > 5
      points: [
        'STP (802.1D / 802.1w Rapid STP) prevents Layer 2 switching loops in redundant topologies by blocking redundant ports',
        'Without STP, broadcast packets loop infinitely (broadcast storm), crashing switch CPUs and consuming 100% bandwidth',
        'Elects a Root Bridge based on lowest Bridge Priority and MAC address',
        'Port states: Blocking, Listening, Learning, Forwarding (or Discarding, Learning, Forwarding in RSTP)',
        'Enterprise hardening: Enable BPDU Guard, Root Guard, and PortFast on all end-user edge access ports',
      ],
    },
    {
      id: 'net-7',
      q: 'What is MTU, and how can an MTU mismatch or PMTUD failure cause web pages or SSL tunnels to stall midway?',
      category: 'Troubleshooting',
      difficulty: 'Advanced',
      complexity: 9, // > 5
      points: [
        'Maximum Transmission Unit (MTU) defines the largest IP packet size (typically 1500 bytes for standard Ethernet)',
        'Encapsulation protocols like IPsec, GRE, or VXLAN add extra header bytes, exceeding 1500 bytes',
        'If Don\'t Fragment (DF) bit is set and an intermediate router cannot forward, packet is dropped (PMTUD failure)',
        'Symptoms: ICMP pings work because packets are small, but SSL/TLS handshakes or large HTTP transfers stall',
        'Fix: Adjust TCP MSS clamping on the firewall/router or configure jumbo frames / lower MTU (e.g. 1420 bytes)',
      ],
    },
  ],
  'System administrator': [
    {
      id: 'sys-2',
      q: 'Explain the 3-2-1 backup rule and the difference between RPO and RTO.',
      category: 'Core Knowledge',
      difficulty: 'Beginner',
      complexity: 4,
      points: [
        '3-2-1 Rule: 3 copies of business data, on 2 different media types, with 1 copy stored securely offsite or immutable cloud',
        'RPO (Recovery Point Objective): The maximum acceptable age of data loss in time (e.g. "we can lose at most 4 hours of transactions")',
        'RTO (Recovery Time Objective): The maximum acceptable downtime to restore systems back online (e.g. "systems restored within 2 hours")',
        'Backup types: Full, Differential (changes since last full), Incremental (changes since last backup of any type)',
        'Backups are worthless unless regular automated restoration drills are executed and verified',
      ],
    },
    {
      id: 'sys-4',
      q: 'How do you design and execute a robust operating system patch management lifecycle?',
      category: 'Process',
      difficulty: 'Beginner',
      complexity: 4,
      points: [
        'Maintain an accurate inventory of physical, virtual, and cloud workloads and baseline configurations',
        'Staged deployment rings: Test in Lab/Dev first, roll to a pilot group (5-10% non-critical), then broader production',
        'Establish scheduled maintenance windows and notify business stakeholders in advance',
        'Always ensure pre-patch recovery checkpoints: snapshot VMs, verify backup completion, and document rollback steps',
        'Review patch compliance audits and vulnerability reports after rollout to catch failed installations',
      ],
    },
    {
      id: 'sys-1',
      q: 'What is Active Directory Domain Services, and how does Group Policy Object (GPO) processing precedence work?',
      category: 'Core Knowledge',
      difficulty: 'Intermediate',
      complexity: 6, // > 5
      points: [
        'Centralized identity directory and authentication provider using Kerberos and LDAP',
        'GPO Processing Order (LSDOU): Local policy, Site, Domain, Organizational Unit (OU)',
        'Deepest OU policy has highest precedence and overwrites higher settings, unless "Enforced" (No Override) is set',
        'Block Inheritance prevents higher domain/parent GPOs from applying unless parent is Enforced',
        'Troubleshoot using gpresult /h report.html or rsop.msc to inspect applied GPOs and precedence conflicts',
      ],
    },
    {
      id: 'sys-5',
      q: 'What is the Principle of Least Privilege (PoLP) and how do you enforce it in an enterprise domain?',
      category: 'Core Knowledge',
      difficulty: 'Intermediate',
      complexity: 6, // > 5
      points: [
        'Users and services are granted only the minimum permissions necessary to complete their specific job functions',
        'Implement Role-Based Access Control (RBAC) using security groups rather than assigning individual user permissions',
        'Enforce separate accounts: IT admins use standard accounts for daily email/browsing and elevated accounts for server tasks',
        'Use Privileged Access Management (PAM) / Just-in-Time (JIT) access with time-bound elevation and MFA',
        'Conduct quarterly access reviews and decommission stale accounts and unneeded permissions immediately',
      ],
    },
    {
      id: 'sys-6',
      q: 'Compare RAID 1, RAID 5, and RAID 10. When would you choose one over another on an enterprise host?',
      category: 'Core Knowledge',
      difficulty: 'Intermediate',
      complexity: 6, // > 5
      points: [
        'RAID 1 (Mirroring): 2 drives, high redundancy, 50% capacity, great for OS boot drives',
        'RAID 5 (Striping with distributed parity): Min 3 drives, tolerates 1 drive failure, storage efficient (N-1), but slow write penalties',
        'RAID 10 (Stripe of Mirrors): Min 4 drives, combines speed of RAID 0 with redundancy of RAID 1, fast rebuild times',
        'RAID 10 is preferred for high-I/O transactional databases and virtualization storage',
        'RAID is for high availability and fault tolerance, never a replacement for independent backups',
      ],
    },
    {
      id: 'sys-3',
      q: 'A mission-critical Windows or Linux production server is pegged at 100% CPU utilization. What is your reaction process?',
      category: 'Troubleshooting',
      difficulty: 'Advanced',
      complexity: 7, // > 5
      points: [
        'Open Task Manager / top / htop to identify the exact PID and process generating the CPU load',
        'Check recent changes: scheduled cron jobs, batch data pipelines, recent deployments, or automated updates',
        'Review application and system logs (Event Viewer, journalctl, /var/log/messages) for rapid crash loops',
        'Mitigate immediate business impact: restart hung worker processes, throttle offending query, or scale compute resources',
        'Capture diagnostic memory dump/profiling before restart if root cause analysis requires post-incident investigation',
      ],
    },
  ],
  'Cloud / DevOps': [
    {
      id: 'cld-1',
      q: 'Explain the Shared Responsibility Model across IaaS, PaaS, and SaaS cloud service models.',
      category: 'Core Knowledge',
      difficulty: 'Beginner',
      complexity: 4,
      points: [
        'IaaS (e.g. AWS EC2, Azure VMs): Provider manages hardware, datacenter, virtualization; you manage OS, patching, apps, data',
        'PaaS (e.g. AWS Elastic Beanstalk, Azure App Service): Provider manages hardware, OS, runtime; you manage code and data',
        'SaaS (e.g. Microsoft 365, Salesforce): Provider manages entire stack; customer is responsible for identity, access, and data governance',
        'Customer ALWAYS owns data classification, IAM access control, and credential hygiene regardless of cloud model',
      ],
    },
    {
      id: 'cld-3',
      q: 'What is the architectural difference between Docker containers and Virtual Machines (VMs)?',
      category: 'Core Knowledge',
      difficulty: 'Beginner',
      complexity: 4,
      points: [
        'Virtual Machines run a complete guest OS on top of a hypervisor (Type 1 or 2), with dedicated virtualized hardware',
        'Containers share the host operating system kernel and run as isolated user-space processes using namespaces and cgroups',
        'Containers are lightweight (megabytes vs gigabytes), start in sub-seconds, and maximize host compute density',
        'VMs provide stronger security isolation boundaries between tenants since kernels are not shared',
      ],
    },
    {
      id: 'cld-2',
      q: 'What is CI/CD, and what are the distinct stages of a modern automated deployment pipeline?',
      category: 'Process',
      difficulty: 'Intermediate',
      complexity: 5,
      points: [
        'Continuous Integration (CI): Developers merge code frequently into main branch, triggering automated build and unit tests',
        'Continuous Delivery/Deployment (CD): Automatically package, stage, and deploy verified artifacts to environments',
        'Pipeline stages: Lint/Syntax check -> Compile/Build -> Automated Unit & Integration Tests -> Security Scan (SAST/DAST) -> Deploy',
        'Enforces rapid feedback loops, eliminates manual deployment errors, and enables safe, repeatable micro-releases',
      ],
    },
    {
      id: 'cld-4',
      q: 'What is Infrastructure as Code (IaC) and what problems does it solve compared to manual console clicks?',
      category: 'Core Knowledge',
      difficulty: 'Intermediate',
      complexity: 6, // > 5
      points: [
        'Managing and provisioning cloud infrastructure through declarative configuration files (e.g. Terraform, CloudFormation)',
        'Enables version control, pull request peer reviews, and automated linting for infrastructure modifications',
        'Eliminates configuration drift and human click errors across development, staging, and production environments',
        'Allows entire multi-region disaster recovery topologies to be rebuilt in minutes deterministically',
      ],
    },
    {
      id: 'cld-6',
      q: 'How do you structure a blameless post-mortem after a high-severity production outage?',
      category: 'Process',
      difficulty: 'Intermediate',
      complexity: 6, // > 5
      points: [
        'Focus on systemic process and tooling failures rather than individual human finger-pointing',
        'Establish an accurate chronological timeline: detection, communication, containment, and restoration timestamps',
        'Analyze root cause using the "5 Whys" technique to understand why existing safeguards and alerts failed to prevent it',
        'Create actionable, assigned backlog work items with deadlines (e.g. add circuit breakers, improve synthetic monitoring)',
        'Publish the report transparently across engineering teams to share institutional learnings',
      ],
    },
    {
      id: 'cld-5',
      q: 'A production Kubernetes pod is stuck in "CrashLoopBackOff". How do you troubleshoot it?',
      category: 'Troubleshooting',
      difficulty: 'Advanced',
      complexity: 8, // > 5
      points: [
        'Run kubectl describe pod <pod-name> to inspect Events: check OOMKilled (Out of Memory), image pull errors, or failed probes',
        'Run kubectl logs <pod-name> --previous to examine the crash error logs from the terminated container instance',
        'Check container health probes (livenessProbe, readinessProbe): verify timeout, port, and health check endpoints',
        'Verify ConfigMaps, Secrets, and environmental variables: missing credentials or unmounted volumes frequently crash apps on startup',
        'If necessary, temporarily override container entrypoint to /bin/sh to inspect filesystem and test connectivity interactively',
      ],
    },
  ],
  'Security': [
    {
      id: 'sec-1',
      q: 'Explain the CIA Triad and give an example of a failure for each principle.',
      category: 'Core Knowledge',
      difficulty: 'Beginner',
      complexity: 3,
      points: [
        'Confidentiality: Data is accessible only to authorized entities (Failure: unauthorized employee reads executive payroll table)',
        'Integrity: Data remains accurate, trustworthy, and unmodified (Failure: an attacker alters bank routing account numbers)',
        'Availability: Systems, networks, and data are accessible when needed (Failure: ransomware encrypts servers or DDoS brings down portal)',
        'Security balance requires weighing all three pillars against business usability and operational constraints',
      ],
    },
    {
      id: 'sec-4',
      q: 'What are the three core authentication factors in Multi-Factor Authentication (MFA), and why is SMS considered weak?',
      category: 'Core Knowledge',
      difficulty: 'Beginner',
      complexity: 4,
      points: [
        'Something you know (password, PIN)',
        'Something you have (authenticator app, FIDO2 hardware security key, smart card)',
        'Something you are (biometrics: fingerprint, facial scan, retina)',
        'SMS is vulnerable to SIM swapping, SS7 telecommunication attacks, and interception',
        'Enterprise standard prefers FIDO2 WebAuthn keys or Authenticator apps with Number Matching to defeat prompt fatigue',
      ],
    },
    {
      id: 'sec-3',
      q: 'What is the difference between symmetric and asymmetric encryption? How does TLS utilize both?',
      category: 'Core Knowledge',
      difficulty: 'Intermediate',
      complexity: 6, // > 5
      points: [
        'Symmetric encryption uses a single shared key for encryption and decryption; extremely fast for bulk data (e.g. AES-256)',
        'Asymmetric encryption uses a mathematically paired public key and private key (e.g. RSA, ECC); computationally intensive',
        'Key distribution dilemma: you cannot safely share a symmetric key over an untrusted public internet',
        'TLS hybrid solution: uses asymmetric encryption (certificates) to authenticate server and securely exchange a ephemeral symmetric session key',
        'All subsequent application web traffic is encrypted using the fast symmetric session key',
      ],
    },
    {
      id: 'sec-5',
      q: 'Outline the 6 standard phases of the incident response lifecycle (NIST / SANS framework).',
      category: 'Process',
      difficulty: 'Intermediate',
      complexity: 6, // > 5
      points: [
        '1. Preparation: Security policies, trained team, EDR tools, tested playbooks, and hardened infrastructure',
        '2. Identification: Detecting indicators of compromise (IoC) via SIEM alerts, firewalls, or user reports',
        '3. Containment: Short-term isolation (pull network cable, isolate VM) and long-term segmentation to stop lateral spread',
        '4. Eradication: Removing malware, wiping compromised machines, closing vulnerabilities, and resetting compromised credentials',
        '5. Recovery: Restoring systems from clean verified backups, testing operations, and monitoring closely for reinfection',
        '6. Lessons Learned: Documenting post-incident review, updating playbooks, and remediating architectural weaknesses',
      ],
    },
    {
      id: 'sec-2',
      q: 'An employee reports clicking a suspicious link in an email that asked for Microsoft 365 credentials. What is your containment plan?',
      category: 'Troubleshooting',
      difficulty: 'Advanced',
      complexity: 7, // > 5
      points: [
        'Immediately isolate: reset the user Microsoft 365 password and revoke all active refresh tokens / browser sessions',
        'Examine user sign-in logs in Entra ID / Azure AD: check for anomalous IP locations, new MFA device registrations, or mailbox forwarding rules',
        'Isolate the endpoint from the corporate network if malware payload execution is suspected',
        'Search email security gateway / SIEM for other recipients of the same message and purge it tenant-wide',
        'Report incident to security leadership, preserve email headers for threat intel, and schedule user refresher training',
      ],
    },
    {
      id: 'sec-6',
      q: 'What are the fundamental tenets of a Zero Trust architecture?',
      category: 'Core Knowledge',
      difficulty: 'Advanced',
      complexity: 7, // > 5
      points: [
        'Never trust, always verify: assume the internal network is just as hostile as the public internet',
        'Explicit verification: authenticate and authorize based on all available data points (user identity, device health, location, workload)',
        'Least privilege access: limit access with Just-In-Time (JIT) and Just-Enough-Access (JEA) policies and adaptive risk-based access',
        'Assume breach: minimize blast radius by segmenting networks, encrypting end-to-end, and using automated threat detection',
      ],
    },
  ],
  'Behavioural (any role)': [
    {
      id: 'beh-4',
      q: 'How do you explain a complex technical concept or issue to a non-technical executive or customer?',
      category: 'Scenario',
      difficulty: 'Beginner',
      complexity: 4,
      points: [
        'Avoid internal acronyms and technical jargon; translate into everyday business impact and analogies',
        'Focus on the "what" and "why" rather than the low-level registry or packet-level mechanics',
        'Check for comprehension by asking clarifying questions and listening attentively',
        'Follow up with a concise written summary outlining agreed next steps and timelines',
      ],
    },
    {
      id: 'beh-5',
      q: 'Why are you interested in this specific role and our organization?',
      category: 'Scenario',
      difficulty: 'Beginner',
      complexity: 4,
      points: [
        'Demonstrate genuine research into the company mission, technical scale, or industry space',
        'Directly map your proven technical capabilities to the specific challenges mentioned in their job description',
        'Express enthusiasm for growth opportunities and technologies utilized in their stack',
        'Articulate how your personal work ethic and reliability will add immediate value to their engineering culture',
      ],
    },
    {
      id: 'beh-1',
      q: 'Tell me about a complex technical problem you encountered that had no obvious solution. How did you resolve it?',
      category: 'Scenario',
      difficulty: 'Intermediate',
      complexity: 6, // > 5
      points: [
        'Situation: Set the scene clearly, explaining the business stakes and why the problem was unusual or challenging',
        'Task: Clearly define your specific responsibility and what needed to be accomplished',
        'Action: Describe the systematic troubleshooting steps you led (logs analyzed, isolation tests run, hypotheses tested)',
        'Result: Concrete outcome with measurable impact (e.g. uptime restored, root cause fixed, SOP written for team)',
      ],
    },
    {
      id: 'beh-2',
      q: 'Describe a mistake you made at work that impacted systems or users. How did you handle it?',
      category: 'Scenario',
      difficulty: 'Intermediate',
      complexity: 6, // > 5
      points: [
        'Take genuine accountability immediately without shifting blame to vendors, documentation, or coworkers',
        'Explain prompt containment actions you took to mitigate the error and alert affected stakeholders',
        'Detail how you diagnosed and resolved the issue responsibly',
        'Highlight the long-term corrective action you implemented (automation safeguard, peer review requirement, checklist)',
      ],
    },
    {
      id: 'beh-3',
      q: 'Tell me about a time you were working under extreme pressure during a major service outage or tight deadline.',
      category: 'Scenario',
      difficulty: 'Advanced',
      complexity: 7, // > 5
      points: [
        'Explain how you prioritized tasks methodically instead of reacting impulsively to noise',
        'Demonstrate how you maintained clear, calm communication with non-technical stakeholders and management',
        'Show collaborative teamwork and ability to divide responsibilities effectively',
        'Reflect on the successful restoration and the post-mortem steps taken to prevent recurrence',
      ],
    },
    {
      id: 'beh-6',
      q: 'Tell me about a time you had a strong disagreement with a colleague or manager regarding a technical decision.',
      category: 'Scenario',
      difficulty: 'Advanced',
      complexity: 7, // > 5
      points: [
        'Describe respectful listening and seeking to understand their underlying concerns and constraints',
        'Show how you framed your argument using empirical data, vendor documentation, or proof-of-concept testing',
        'Demonstrate professional alignment: once a decision was finalized, committing fully even if it was not your original preference',
        'Focus on the positive business outcome and sustained mutual respect with the colleague',
      ],
    },
    {
      id: 'beh-7',
      q: 'Describe a situation where you had to master a new technology or tool very quickly to solve an urgent problem.',
      category: 'Scenario',
      difficulty: 'Advanced',
      complexity: 7, // > 5
      points: [
        'Explain the catalyst that required rapid upskilling without prior formal training',
        'Detail your structured learning strategy: reading official documentation, building a quick sandbox lab, reviewing examples',
        'Describe successful implementation under time constraints',
        'Explain how you shared the acquired knowledge by documenting an internal guide or training peers',
      ],
    },
  ],
};

interface StoredPracticeRecord {
  role: RoleName;
  questionId: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  pct: number;
  date: string;
}

/**
 * Filter questions by role and difficulty level
 */
function getFilteredQuestions(role: RoleName, difficulty: DifficultyLevel): QuestionItem[] {
  const allForRole = QUESTION_BANK[role] || [];
  if (difficulty === 'All') return allForRole;
  return allForRole.filter(q => q.difficulty === difficulty);
}

/**
 * Shuffles the filtered questions pool and guarantees that Question 2 (index 1)
 * is drawn from a randomized selection of questions with complexity > 5 (or highest complexity if beginner).
 */
function generateSessionOrderForPool(
  pool: QuestionItem[],
  previousQuestion2Id?: string
): number[] {
  const total = pool.length;
  if (total <= 1) return [0];

  // 1. Find indices of questions with complexity > 5
  const highComplexityIndices: number[] = [];
  pool.forEach((q, idx) => {
    if (q.complexity > 5) {
      highComplexityIndices.push(idx);
    }
  });

  // If no questions > 5 exist (e.g., pure Beginner subset), pick from the highest complexity available
  let eligibleChoices = highComplexityIndices;
  if (eligibleChoices.length === 0) {
    const maxComp = Math.max(...pool.map(q => q.complexity));
    eligibleChoices = pool
      .map((q, idx) => (q.complexity === maxComp ? idx : -1))
      .filter(idx => idx !== -1);
  }

  // Avoid repeating the exact same Question 2 if alternatives exist
  if (eligibleChoices.length > 1 && previousQuestion2Id) {
    const filtered = eligibleChoices.filter(idx => pool[idx].id !== previousQuestion2Id);
    if (filtered.length > 0) eligibleChoices = filtered;
  }

  const chosenHighIndex =
    eligibleChoices[Math.floor(Math.random() * eligibleChoices.length)];

  // 2. Gather all other indices
  const remainingIndices: number[] = [];
  for (let i = 0; i < total; i++) {
    if (i !== chosenHighIndex) {
      remainingIndices.push(i);
    }
  }

  // 3. Fisher-Yates shuffle remaining pool
  for (let i = remainingIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingIndices[i], remainingIndices[j]] = [remainingIndices[j], remainingIndices[i]];
  }

  // 4. Return [Question 1, Question 2 (chosen high complexity), ...rest of questions]
  return [remainingIndices[0], chosenHighIndex, ...remainingIndices.slice(1)];
}

export const ITInterviewPractice: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<RoleName>('Help desk / service desk');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('All');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [shuffledOrder, setShuffledOrder] = useState<number[]>([]);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [revealed, setRevealed] = useState<boolean>(false);
  const [checkedPoints, setCheckedPoints] = useState<boolean[]>([]);
  const [timerDuration, setTimerDuration] = useState<number>(120); // 120s = 2m
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [practiceHistory, setPracticeHistory] = useState<StoredPracticeRecord[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const roleSelectId = useId();
  const diffSelectId = useId();
  const answerTextareaId = useId();

  // Active question pool based on role and difficulty filter
  const activePool = useMemo(() => {
    return getFilteredQuestions(selectedRole, selectedDifficulty);
  }, [selectedRole, selectedDifficulty]);

  // Load progress history on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('iv_prog');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setPracticeHistory(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2800);
  };

  const persistHistory = (newHistory: StoredPracticeRecord[]) => {
    setPracticeHistory(newHistory);
    try {
      localStorage.setItem('iv_prog', JSON.stringify(newHistory.slice(-300)));
    } catch {
      // Ignore storage error
    }
  };

  const resetQuestionState = (pool: QuestionItem[], qIndex: number) => {
    const currentQ = pool[qIndex] || pool[0];
    setUserAnswer('');
    setRevealed(false);
    setCheckedPoints(new Array(currentQ ? currentQ.points.length : 0).fill(false));
    stopTimer();
    setTimeLeft(timerDuration);
  };

  // Re-shuffle when role or difficulty level changes
  useEffect(() => {
    const pool = getFilteredQuestions(selectedRole, selectedDifficulty);
    const newOrder = generateSessionOrderForPool(pool);
    setShuffledOrder(newOrder);
    setCurrentIndex(0);
    resetQuestionState(pool, newOrder[0]);
  }, [selectedRole, selectedDifficulty]);

  // Restart practice session manually
  const handleRestartSession = () => {
    const previousQ2Id = activePool[shuffledOrder[1]]?.id;
    const newOrder = generateSessionOrderForPool(activePool, previousQ2Id);
    setShuffledOrder(newOrder);
    setCurrentIndex(0);
    resetQuestionState(activePool, newOrder[0]);
    showToast(
      `Restarted ${selectedDifficulty !== 'All' ? selectedDifficulty + ' ' : ''}session with randomized questions!`
    );
  };

  // Timer lifecycle
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            setIsTimerRunning(false);
            showToast("Time's up! Wrap up your answer.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const toggleTimer = () => {
    if (isTimerRunning) {
      stopTimer();
    } else {
      if (timeLeft === 0) setTimeLeft(timerDuration);
      setIsTimerRunning(true);
    }
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleTimerDurationChange = (seconds: number) => {
    setTimerDuration(seconds);
    setTimeLeft(seconds);
    stopTimer();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Advance to next question dynamically
  const handleNextQuestion = () => {
    const total = activePool.length;
    let nextPos = currentIndex + 1;
    let order = shuffledOrder;

    if (nextPos >= total) {
      const prevQ2Id = activePool[shuffledOrder[1]]?.id;
      order = generateSessionOrderForPool(activePool, prevQ2Id);
      setShuffledOrder(order);
      nextPos = 0;
      showToast('Completed deck! Re-shuffled new dynamic sequence.');
    }

    setCurrentIndex(nextPos);
    resetQuestionState(activePool, order[nextPos]);
  };

  const handlePointToggle = (index: number) => {
    setCheckedPoints(prev => {
      const copy = [...prev];
      copy[index] = !copy[index];
      return copy;
    });
  };

  const currentQuestionIdx = shuffledOrder[currentIndex] ?? 0;
  const currentQuestion: QuestionItem =
    activePool[currentQuestionIdx] || activePool[0] || QUESTION_BANK[selectedRole][0];
  const totalInPool = activePool.length;

  const pointsCount = currentQuestion.points.length;
  const checkedCount = checkedPoints.filter(Boolean).length;
  const coveragePercent = pointsCount > 0 ? Math.round((checkedCount / pointsCount) * 100) : 0;

  const handleSaveResult = () => {
    const newRecord: StoredPracticeRecord = {
      role: selectedRole,
      questionId: currentQuestion.id,
      difficulty: currentQuestion.difficulty,
      pct: coveragePercent,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    const updated = [newRecord, ...practiceHistory];
    persistHistory(updated);
    showToast(`Saved result (${coveragePercent}% coverage)!`);
  };

  const handleResetHistory = () => {
    if (window.confirm('Reset all saved practice statistics?')) {
      persistHistory([]);
      showToast('Practice history cleared');
    }
  };

  // Helper for counting difficulty breakdown in selected role
  const roleDifficultyCounts = useMemo(() => {
    const questions = QUESTION_BANK[selectedRole] || [];
    return {
      All: questions.length,
      Beginner: questions.filter(q => q.difficulty === 'Beginner').length,
      Intermediate: questions.filter(q => q.difficulty === 'Intermediate').length,
      Advanced: questions.filter(q => q.difficulty === 'Advanced').length,
    };
  }, [selectedRole]);

  // Grouped stats by role
  const statsByRole = useMemo(() => {
    const map: Record<string, { count: number; totalPct: number }> = {};
    practiceHistory.forEach(record => {
      if (!map[record.role]) {
        map[record.role] = { count: 0, totalPct: 0 };
      }
      map[record.role].count += 1;
      map[record.role].totalPct += record.pct;
    });

    return Object.entries(map).map(([role, data]) => ({
      role,
      count: data.count,
      avgPct: Math.round(data.totalPct / data.count),
    }));
  }, [practiceHistory]);

  const overallAvg = useMemo(() => {
    if (!practiceHistory.length) return 0;
    const total = practiceHistory.reduce((acc, curr) => acc + curr.pct, 0);
    return Math.round(total / practiceHistory.length);
  }, [practiceHistory]);

  const getDifficultyBadgeColor = (diff: 'Beginner' | 'Intermediate' | 'Advanced') => {
    switch (diff) {
      case 'Beginner':
        return {
          bg: 'rgba(52, 211, 153, 0.12)',
          border: 'rgba(52, 211, 153, 0.35)',
          color: 'var(--emerald)',
        };
      case 'Intermediate':
        return {
          bg: 'rgba(56, 189, 248, 0.12)',
          border: 'rgba(56, 189, 248, 0.35)',
          color: 'var(--accent)',
        };
      case 'Advanced':
        return {
          bg: 'rgba(251, 191, 36, 0.15)',
          border: 'rgba(251, 191, 36, 0.4)',
          color: 'var(--amber)',
        };
    }
  };

  return (
    <div className="page">
      {/* Toast Notice */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'var(--text)',
            color: 'var(--bg)',
            padding: '10px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.35)',
            fontSize: '0.92rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} color="var(--emerald)" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="container">
        {/* Breadcrumb & Social Share */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Tools', href: '/tools' },
              { label: 'IT Interview Practice' },
            ]}
            style={{ marginBottom: 0 }}
          />
          <SocialShareBar
            title="IT Interview Practice | Jawed Imtiaz"
            text="Practise real IT interview questions with difficulty level filtering, interactive timer, answer workspace, and key talking points checklist across Help Desk, SysAdmin, Network, Cloud, and Security roles."
            url={typeof window !== 'undefined' ? `${window.location.origin}/tools/it-interview-practice` : 'https://jawed.co.in/tools/it-interview-practice'}
          />
        </div>

        {/* Page Header */}
        <header style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--accent)',
                background: 'rgba(56, 189, 248, 0.1)',
                padding: '3px 10px',
                borderRadius: '999px',
                border: '1px solid rgba(56, 189, 248, 0.25)',
              }}
            >
              Interactive Mock Rehearsal
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ShieldCheck size={14} color="var(--emerald)" aria-hidden="true" /> 100% Private (No Drafts Uploaded)
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '0 0 10px',
              color: 'var(--text-heading)',
            }}
          >
            IT Interview Practice
          </h1>
          <p
            className="lead"
            style={{
              fontSize: '1.05rem',
              color: 'var(--muted)',
              maxWidth: '820px',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Practise real technical and behavioral interview questions across Service Desk, Field Tech, Networking, Systems, Cloud, and Security. Filter by difficulty level, time your delivery, and sharpen your technical communication.
          </p>
        </header>

        {/* Interactive Workspace Panel */}
        <section
          className="panel"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
          }}
        >
          {/* Controls Bar: Role Selector, Difficulty Selector, and Timer */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px',
              borderBottom: '1px solid var(--line)',
              paddingBottom: '20px',
              marginBottom: '20px',
            }}
          >
            {/* 1. Target Role Discipline */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label
                  htmlFor={roleSelectId}
                  style={{
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  Target Role Discipline
                </label>
                <button
                  type="button"
                  onClick={handleRestartSession}
                  title="Restart practice session and shuffle questions"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Shuffle size={12} color="var(--accent)" aria-hidden="true" />
                  Restart
                </button>
              </div>

              <select
                id={roleSelectId}
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value as RoleName)}
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                }}
              >
                {Object.keys(QUESTION_BANK).map(role => (
                  <option key={role} value={role}>
                    {role} ({QUESTION_BANK[role as RoleName].length} questions)
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Difficulty Level Selector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label
                  htmlFor={diffSelectId}
                  style={{
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: 'var(--text)',
                    margin: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Filter size={13} color="var(--accent)" aria-hidden="true" />
                  Difficulty Level
                </label>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Filters question pool
                </span>
              </div>

              {/* Segmented Pill Selector for quick toggling */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '6px' }}>
                {(['All', 'Beginner', 'Intermediate', 'Advanced'] as const).map(diff => {
                  const isSelected = selectedDifficulty === diff;
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setSelectedDifficulty(diff)}
                      style={{
                        background: isSelected ? 'var(--accent)' : 'var(--bg)',
                        color: isSelected ? '#ffffff' : 'var(--text)',
                        border: '1px solid ' + (isSelected ? 'var(--accent)' : 'var(--line)'),
                        borderRadius: '8px',
                        padding: '6px 4px',
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {diff}
                      <span style={{ display: 'block', fontSize: '0.7rem', opacity: isSelected ? 0.9 : 0.6 }}>
                        ({roleDifficultyCounts[diff]})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Speaking Timer with Preset Selection */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
                  Pacing Timer
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[
                    { label: '1m', sec: 60 },
                    { label: '2m', sec: 120 },
                    { label: '3m', sec: 180 },
                  ].map(p => (
                    <button
                      key={p.sec}
                      type="button"
                      onClick={() => handleTimerDurationChange(p.sec)}
                      style={{
                        background: timerDuration === p.sec ? 'var(--accent)' : 'var(--bg)',
                        color: timerDuration === p.sec ? '#fff' : 'var(--muted)',
                        border: '1px solid ' + (timerDuration === p.sec ? 'var(--accent)' : 'var(--line)'),
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '8px 14px',
                }}
              >
                <Timer
                  size={20}
                  color={isTimerRunning ? 'var(--accent)' : timeLeft <= 15 ? 'var(--bad, #f87171)' : 'var(--muted)'}
                  aria-hidden="true"
                />
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: timeLeft <= 15 ? 'var(--bad, #f87171)' : 'var(--text-heading)',
                    minWidth: '70px',
                  }}
                >
                  {formatTimer(timeLeft)}
                </span>

                <button
                  type="button"
                  onClick={toggleTimer}
                  style={{
                    background: isTimerRunning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid ' + (isTimerRunning ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)'),
                    color: isTimerRunning ? '#ef4444' : 'var(--accent)',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isTimerRunning ? <Square size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                  {isTimerRunning ? 'Stop' : 'Start'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopTimer();
                    setTimeLeft(timerDuration);
                  }}
                  title="Reset Timer"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: '6px',
                  }}
                >
                  <RotateCcw size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Current Question Display */}
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--accent)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {selectedRole}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>•</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    color: 'var(--muted)',
                  }}
                >
                  {currentQuestion.category}
                </span>

                {/* Difficulty Badge */}
                {(() => {
                  const badge = getDifficultyBadgeColor(currentQuestion.difficulty);
                  return (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: badge.bg,
                        border: `1px solid ${badge.border}`,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        color: badge.color,
                      }}
                    >
                      {currentQuestion.difficulty}
                    </span>
                  );
                })()}

                {/* Explicit Complexity Indicator */}
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background:
                      currentQuestion.complexity > 5
                        ? 'rgba(251, 191, 36, 0.15)'
                        : 'rgba(56, 189, 248, 0.1)',
                    border:
                      '1px solid ' +
                      (currentQuestion.complexity > 5
                        ? 'rgba(251, 191, 36, 0.4)'
                        : 'rgba(56, 189, 248, 0.25)'),
                    padding: '2px 8px',
                    borderRadius: '6px',
                    color:
                      currentQuestion.complexity > 5 ? 'var(--amber)' : 'var(--accent)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Zap size={11} aria-hidden="true" />
                  Complexity: {currentQuestion.complexity}/10
                  {currentQuestion.complexity > 5 && ' (High)'}
                </span>
              </div>

              {/* Dynamic Question Counter & Question 2 Banner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {currentIndex === 1 && currentQuestion.complexity > 5 && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--amber)',
                      background: 'rgba(251, 191, 36, 0.1)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '99px',
                    }}
                  >
                    Question 2 Target (Complexity &gt; 5)
                  </span>
                )}
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-heading)',
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    padding: '3px 10px',
                    borderRadius: '99px',
                  }}
                >
                  Question {currentIndex + 1} of {totalInPool}
                </span>
              </div>
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                lineHeight: 1.5,
                color: 'var(--text-heading)',
              }}
            >
              {currentQuestion.q}
            </h2>
          </div>

          {/* Answer Sandbox Textarea */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label
                htmlFor={answerTextareaId}
                style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}
              >
                Practice your verbal structure or bullet notes
              </label>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Stays in your browser memory; never uploaded
              </span>
            </div>
            <textarea
              id={answerTextareaId}
              rows={4}
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              placeholder="Outline your response steps out loud or jot quick mental hooks (e.g. Scope -> Identify -> Mitigate -> Document)..."
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '12px 14px',
                color: 'var(--text)',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
          </div>

          {/* Action Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: revealed ? '20px' : '0',
            }}
          >
            <button
              type="button"
              onClick={() => setRevealed(prev => !prev)}
              style={{
                background: revealed ? 'var(--bg)' : 'linear-gradient(90deg, var(--accent), var(--indigo))',
                border: revealed ? '1px solid var(--line)' : 0,
                color: revealed ? 'var(--text)' : '#ffffff',
                fontWeight: 600,
                fontSize: '0.92rem',
                padding: '9px 18px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: revealed ? 'none' : '0 4px 12px rgba(56, 189, 248, 0.25)',
              }}
            >
              <Sparkles size={16} aria-hidden="true" />
              {revealed ? 'Hide Evaluation Checklist' : 'Reveal what a strong answer covers'}
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleRestartSession}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--text)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Shuffle size={14} color="var(--accent)" aria-hidden="true" />
                <span>Shuffle / Restart</span>
              </button>

              <button
                type="button"
                onClick={handleNextQuestion}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--text-heading)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Next question</span>
                <ArrowRight size={15} color="var(--accent)" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Key Talking Points Checklist (Reveal Panel) */}
          {revealed && (
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                    Key Points Checklist
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    Tick the items you mentioned in your verbal answer to evaluate coverage:
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: coveragePercent >= 80 ? 'var(--emerald)' : coveragePercent >= 50 ? 'var(--amber)' : 'var(--muted)',
                  }}
                >
                  Covered {checkedCount} of {pointsCount} ({coveragePercent}%)
                </div>
              </div>

              {/* Interactive checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                {currentQuestion.points.map((pt, idx) => {
                  const isChecked = checkedPoints[idx] || false;
                  return (
                    <label
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        cursor: 'pointer',
                        background: isChecked ? 'rgba(52, 211, 153, 0.06)' : 'var(--card)',
                        border: '1px solid ' + (isChecked ? 'rgba(52, 211, 153, 0.35)' : 'var(--line)'),
                        borderRadius: '8px',
                        padding: '10px 12px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handlePointToggle(idx)}
                        style={{
                          marginTop: '3px',
                          cursor: 'pointer',
                          width: '18px',
                          height: '18px',
                          accentColor: 'var(--emerald)',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '0.92rem',
                          color: isChecked ? 'var(--text-heading)' : 'var(--text)',
                          lineHeight: 1.5,
                        }}
                      >
                        {pt}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Save result action */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleSaveResult}
                  style={{
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: 'var(--accent)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <BookmarkCheck size={15} aria-hidden="true" />
                  Save result ({coveragePercent}%)
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Progress & History Dashboard */}
        <section
          className="panel"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                Your Practice Progress
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                Track your self-rated coverage across technical domains
              </span>
            </div>

            {practiceHistory.length > 0 && (
              <button
                type="button"
                onClick={handleResetHistory}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Trash2 size={13} aria-hidden="true" />
                Reset history
              </button>
            )}
          </div>

          {practiceHistory.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.92rem', margin: 0, fontStyle: 'italic' }}>
              No practice answers recorded yet. Reveal the checklist on any question and click &quot;Save result&quot; to begin building your progress metrics.
            </p>
          ) : (
            <div>
              {/* Overall metric chips */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Total Questions Practiced
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                    {practiceHistory.length}
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Average Answer Coverage
                  </span>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: overallAvg >= 75 ? 'var(--emerald)' : overallAvg >= 50 ? 'var(--amber)' : 'var(--text-heading)',
                    }}
                  >
                    {overallAvg}%
                  </div>
                </div>
              </div>

              {/* Table breakdown by role */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', color: 'var(--muted)', fontWeight: 600 }}>Role Discipline</th>
                      <th style={{ padding: '8px 12px', color: 'var(--muted)', fontWeight: 600 }}>Answers Practiced</th>
                      <th style={{ padding: '8px 12px', color: 'var(--muted)', fontWeight: 600 }}>Average Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsByRole.map(item => (
                      <tr key={item.role} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text)' }}>{item.role}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{item.count}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: item.avgPct >= 75 ? 'var(--emerald)' : item.avgPct >= 50 ? 'var(--amber)' : 'var(--text)',
                            }}
                          >
                            {item.avgPct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* How to Prepare Guide Section */}
        <section
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 12px', color: 'var(--text-heading)' }}>
            How to prepare for an IT interview
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: 1.6, margin: '0 0 16px' }}>
            IT technical interviews assess three primary dimensions: fundamental technical knowledge, logical troubleshooting discipline, and behavioral ownership. This rehearsal tool provides realistic scenario questions, a pacing timer, and talking point checklists so you can identify and patch blind spots.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              margin: '20px 0',
            }}
          >
            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
                1. Structured Troubleshooting
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Always address incidents in order: Scope the impact (one or all?), check physical basics, isolate variables, apply fix, verify resolution, and document.
              </p>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
                2. STAR Behavioral Method
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Structure behavioral questions as Situation, Task, Action, Result. Allocate 70% of your time to what <em>you personally</em> diagnosed and executed.
              </p>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
                3. Truthful Transparency
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                If you haven&apos;t used a specific vendor or tool, never fake it. Say: &quot;I haven&apos;t managed that specific appliance, but conceptually here is how I would test and verify it.&quot;
              </p>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
                4. Rehearse Out Loud
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Talking out loud builds muscle memory. Aim for a crisp 90 to 120-second delivery without rambling or trailing off into tangent stories.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '40px',
          }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 16px', color: 'var(--text-heading)' }}>
            Frequently Asked Questions
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              {
                q: 'How does the difficulty level selector work?',
                a: 'The difficulty selector allows you to filter the question pool before shuffling into Beginner (foundational concepts and standard procedures), Intermediate (incident diagnostics and core systems), or Advanced (multi-tiered root-cause analysis, kernel dumps, and architectural edge cases).',
              },
              {
                q: 'How does the question shuffling work?',
                a: 'Every time the tool loads or when you switch roles, filter by difficulty, or click "Restart Session", the questions in the selected pool are dynamically randomized using the Fisher-Yates algorithm. Furthermore, Question 2 is specially picked at random from questions with complexity level > 5.',
              },
              {
                q: 'Is my written answer stored or transmitted anywhere?',
                a: 'No. The rehearsal draft textbox is purely client-side temporary state. Only your self-graded checklist coverage score percentages are saved in your local browser storage (localStorage).',
              },
              {
                q: 'Why are questions rated by complexity levels?',
                a: 'Real interviews progressively challenge you with unexpected multi-layered technical problems. The complexity rating (1-10) reflects diagnostic depth, tool scope, and business impact.',
              },
              {
                q: 'Will practicing here guarantee an interview offer?',
                a: 'No automated tool can guarantee hiring outcomes. However, regular timed practice helps eliminate filler words, structures your technical problem solving, and ensures you hit the critical architectural points interviewers look for.',
              },
              {
                q: 'How should I pace a 2-minute technical answer?',
                a: 'Spend 20 seconds defining scope and clarifying questions, 60 seconds explaining your technical diagnosis or actions, and 40 seconds on verification, root-cause documentation, and stakeholder communication.',
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      background: 'var(--bg)',
                      border: 'none',
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'var(--text-heading)',
                      fontWeight: 600,
                      fontSize: '0.98rem',
                    }}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} color="var(--muted)" /> : <ChevronDown size={18} color="var(--muted)" />}
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: '14px 18px',
                        background: 'var(--card)',
                        borderTop: '1px solid var(--line)',
                        color: 'var(--muted)',
                        fontSize: '0.92rem',
                        lineHeight: 1.6,
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
