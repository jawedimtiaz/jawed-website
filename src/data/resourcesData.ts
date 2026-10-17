export interface ResourceItem {
  title: string;
  category: string;
  source: string;
  url: string;
  description: string;
}

export const resourcesList: ResourceItem[] = [
  {
    title: 'Apple Platform Deployment Guide',
    category: 'Apple & macOS',
    source: 'Apple Support',
    url: 'https://support.apple.com/en-in/guide/deployment/welcome/web',
    description: 'Official comprehensive reference for Apple device deployment, MDM enrollment, supervision, and configuration profiles.'
  },
  {
    title: 'Enrollment Methods for Apple Devices',
    category: 'Apple & macOS',
    source: 'Apple Support',
    url: 'https://support.apple.com/guide/deployment/enrollment-methods-for-apple-devices-dep08f54fcf6/1/web/1.0',
    description: 'Detailed distinction between User Enrollment, Device Enrollment, and Automated Device Enrollment.'
  },
  {
    title: 'Jamf Pro Documentation',
    category: 'Apple & macOS',
    source: 'Jamf Learn',
    url: 'https://learn.jamf.com/r/en-US/jamf-pro-documentation-current/Enrollment_into_Jamf_MDM',
    description: 'Current technical documentation for managing macOS and iOS devices with Jamf Pro MDM.'
  },
  {
    title: 'Microsoft Entra ID (Azure AD) Documentation',
    category: 'Microsoft',
    source: 'Microsoft Learn',
    url: 'https://learn.microsoft.com/en-us/entra/',
    description: 'Official guides for identity management, conditional access, single sign-on, and MFA diagnostics.'
  },
  {
    title: 'Windows Client Troubleshooting Documentation',
    category: 'Microsoft',
    source: 'Microsoft Learn',
    url: 'https://learn.microsoft.com/en-us/troubleshoot/windows-client/',
    description: 'Technical troubleshooting guides for Windows operating system issues, boot, updates, and connectivity.'
  },
  {
    title: 'MDN Web Docs: Client-Side Web APIs',
    category: 'Web & APIs',
    source: 'Mozilla Developer Network',
    url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_APIs/Introduction',
    description: 'Introduction to HTTP requests, REST APIs, JSON parsing, and browser web capabilities.'
  },
  {
    title: 'OWASP Top 10 Client-Side Security Risks',
    category: 'Security & Web',
    source: 'OWASP Foundation',
    url: 'https://owasp.org/projects/top-10-client-side-security-risks/',
    description: 'Best practice security boundaries for client-side applications, storage limits, and sensitive data protection.'
  },
  {
    title: 'NIST AI Risk Management Framework',
    category: 'AI & Governance',
    source: 'NIST',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    description: 'Voluntary framework for organizations to govern AI systems responsibly and mitigate privacy and hallucination risks.'
  },
  {
    title: 'IRDAI Health Insurance Policyholder Information',
    category: 'Personal Finance',
    source: 'Insurance Regulatory and Development Authority of India',
    url: 'https://irdai.gov.in/health-dept',
    description: 'Official regulatory guidelines on waiting periods, portability, health policy terms, and consumer rights in India.'
  },
  {
    title: 'Bima Bharosa Portal',
    category: 'Personal Finance',
    source: 'IRDAI Grievance Redressal',
    url: 'https://bimabharosa.irdai.gov.in/',
    description: 'Official grievance escalation portal for Indian insurance policyholders.'
  },
  {
    title: 'Income Tax Department of India Portal',
    category: 'Personal Finance',
    source: 'Incometax.gov.in',
    url: 'https://www.incometax.gov.in/',
    description: 'Official tax rules, e-filing utilities, slab announcements, and compliance guidance for Indian individual tax returns.'
  },
  {
    title: 'Reserve Bank of India (RBI) Financial Education',
    category: 'Personal Finance',
    source: 'RBI',
    url: 'https://www.rbi.org.in/',
    description: 'Official central bank education resources on banking safety, budgeting, savings, and safe digital transactions.'
  }
];
