export interface BlogPost {
  slug: string;
  title: string;
  eyebrow: string;
  lead: string;
  publishedDate: string;
  updatedDate: string;
  category: string;
  readTime: string;
  summary: string;
  content: string[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'triage-workplace-app-access-issue',
    title: 'How to Triage a Workplace App Access Issue: An Illustrative Walkthrough',
    eyebrow: 'Blog · IT Support',
    category: 'IT Support',
    publishedDate: '2026-10-12',
    updatedDate: '2026-10-13',
    readTime: '8 min read',
    lead: 'A step-by-step example of how to scope an application access problem, separate observations from assumptions, choose safe checks, and prepare a useful handoff.',
    summary: 'An illustrative IT support walkthrough for scoping app access issues, collecting evidence, validating results, and escalating clearly without guessing.',
    content: [
      'First, define the problem: This is a fictional teaching scenario, not a report of an actual user incident. Imagine a user says, "The workplace scheduling app will not open." That sentence describes a symptom, but it does not yet tell us whether the cause is the device, account, network, application or service.',
      'Step 1: Establish the scope. Use the smallest safe comparisons available. Does the problem appear limited to one user, or have multiple authorized users reported it? Does the symptom occur on this device only, or is an approved comparison available? Do other applications work as expected? Is there a known service incident or shared dependency?',
      'Step 2: Record evidence before changing anything. Suppose the user can reach other approved services, but the scheduling app displays an access error. Record that as an observation. Do not immediately conclude that the network is healthy or that the account is broken. Record affected task, exact error text, approximate time, and OS context.',
      'Step 3: Choose one discriminating check. Pick a check that can distinguish between plausible explanations and is permitted by your support role. Avoid changing several settings at once, disabling security controls, bypassing VPN, or reinstalling software without evidence.',
      'Step 4: Separate facts from hypotheses. Keep the investigation language precise: Observed (the app shows an error), Tested (other services worked), Possible (an identity token may have expired), Confirmed (only when evidence proves the cause).',
      'Step 5: Validate the original task. After an approved fix or service recovery, have the user repeat the original task. "The error disappeared" is not enough if the user still cannot complete their work.',
      'Step 6: Make the handoff actionable. If another team must continue, provide the symptom and impact, scope comparisons, timestamps, checks and results, changes made, and what specific action is requested.'
    ]
  },
  {
    slug: 'rebuilding-jawed-co-in',
    title: 'Rebuilding Jawed.co.in',
    eyebrow: 'Blog · Website Project',
    category: 'Website Project',
    publishedDate: '2026-09-27',
    updatedDate: '2026-10-12',
    readTime: '9 min read',
    lead: 'How I moved an old personal website to a simpler, modern foundation built around the work I do today and the topics I want to document next.',
    summary: 'A look at the audit, content decisions, technical foundation, and engineering checks behind the new Jawed.co.in.',
    content: [
      'Why rebuild? Jawed.co.in started as a personal website during the early part of my IT career. It grew around technical certification study material and useful references. Over the years, much of that technology became outdated. Instead of trying to modernize every old page, I audited the site, preserved the useful personal history, and rebuilt the public structure from scratch.',
      'What changed: The old fixed-layout pages and legacy dependencies were removed. Obsolete certifications were retired. The site uses a clean, mobile-first foundation with Work, Notes, Blog, Tools, and Resources providing the main structure.',
      'Start with the job the site needs to do: A rebuild is easier to scope when the site has a clear purpose. I treated this as a professional portfolio and practical knowledge resource, not a general-purpose publishing platform.',
      'Separate interactive boundaries: Browser tools and AI experiences are treated differently from editorial pages because they have distinct privacy, reliability, and user-expectation considerations.',
      'Make quality checks part of publishing: Route integrity, navigation and internal links, descriptive metadata, accessibility and responsive behavior, and deployment verification.',
      'Lessons: Define boundaries before adding features; prefer maintainable content over page count; automate objective checks; keep examples honest; and verify the deployed result.'
    ]
  }
];
