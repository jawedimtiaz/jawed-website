# Phase 122GVS — Critical external-reference review

**Date:** 2026-10-14  
**Repository:** `jawedimtiaz/jawed-website`  
**Base commit:** `ffffebccbd60cc67a091c5237c1ff5ac022e33c2`  
**Decision:** Selected official references reviewed; no link replacement or public-copy change justified by the evidence. AdSense remains inactive.

## Scope and method

This is a bounded review of critical references in the privacy page and selected retirement, portfolio, U.S.-investment, Indian mutual-fund, income-tax and health-insurance notes. It combines repository-source inspection with current web checks of the actual destination URLs. It is not a comprehensive external-link crawler or a full legal/financial accuracy audit.

## Verified destinations

| Site page / purpose | External destination | Result |
|---|---|---|
| Privacy — Cloudflare processing | [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/) | Official policy page opened successfully; current policy content present. |
| Privacy — Analytics disclosure | [Google Analytics data collection](https://support.google.com/analytics/answer/11593727) | Official help page opened; describes default data collection and identifiers. Relevant to the disclosure context. |
| Privacy — Google services | [Google Privacy Policy](https://policies.google.com/privacy) | Official policy page opened; current policy content present. |
| Retirement withdrawals | [PFRDA NPS All Citizen Models](https://pfrda.org.in/en/schemes/national-pension-system/nps-for-all-citizen-models) | Official regulator page opened; includes eligibility, investment choices, charges and withdrawal/exit information. |
| Retirement income | [Investor.gov: Managing Lifetime Income](https://www.investor.gov/additional-resources/retirement-toolkit/managing-lifetime-income) | Official U.S. SEC investor-education page opened; relevant to longevity and retirement-income risks. |
| Portfolio allocation | [Investor.gov: Asset Allocation and Diversification](https://www.investor.gov/introduction-investing/getting-started/asset-allocation) | Official investor-education page opened; relevant to allocation, time horizon, risk tolerance and rebalancing. |
| U.S. investment / Indian resident context | [RBI Master Direction — Liberalised Remittance Scheme](https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=10192) | Official RBI page opened; current page states it was updated on 14 October 2026 and identifies the LRS Master Direction updated 6 September 2024. |
| Foreign-asset reporting context | [Income Tax Department: NUDGE on Schedule FA](https://www.incometax.gov.in/iec/foportal/nudge/nudge-schedule-fa) | Official portal page opened; discusses foreign-asset/income schedules. |
| Mutual-fund scheme categories | [AMFI: Categorization of Mutual Fund Schemes](https://www.amfiindia.com/investor/knowledge-center-info?zoneName=CategorizationOfMutualFundSchemes) | Official AMFI investor page opened; content is relevant to scheme categories. |
| Mutual-fund risk | [SEBI Investor: Understanding the Riskometer](https://investor.sebi.gov.in/riskometer.html) | Official SEBI investor page opened; explains the riskometer and scheme risk levels. |
| Mutual-fund investor safeguards | [SEBI Investor: Mutual Funds PDF](https://investor.sebi.gov.in/pdf/reference-material/MFunds.pdf) | Official SEBI investor PDF opened; contains investor dos, don'ts, rights and responsibilities. |
| Tax rates and computation | [Income Tax Department: Tax Rates and Computation](https://www.incometaxindia.gov.in/w/tax-rates-and-computation) | Official Income Tax Department page opened; includes tax-year/assessment-year information and computation guidance. |
| Tax-law transition | [Income Tax Department: FAQs on Interplay and Transitions](https://www.incometaxindia.gov.in/documents/20117/43120/Updated-FQAs-on-Interplay%26Transitions.pdf/dda21cfd-28be-d931-ad5c-6459ecbd2ea7?download=true&t=1775128133037&version=2.0) | Direct browser fetch timed out, but search indexed this exact official PDF and returned its transition content. Treat as a fetch limitation, not a confirmed broken link. |
| Health-insurance guidance | [IRDAI Health Department](https://irdai.gov.in/health-dept) | Direct browser open returned 403, but search indexed the official page and its health-insurance FAQs. This is consistent with a crawler/access limitation; it does not establish a broken destination. |
| Google Ads preferences | [Google Ads Settings](https://adssettings.google.com/) | The destination redirected to a Google preferences endpoint that the browser tool could not fetch. It is user/account-contextual; no broken-link conclusion is warranted. |

## Content-context checks

- The Indian income-tax note explicitly scopes itself to income earned from 1 April 2025 to 31 March 2026 under the Income-tax Act, 1961 and reported under AY 2026–27.
- It separately identifies Tax Year 2026–27 as the period from 1 April 2026 to 31 March 2027 governed by the Income-tax Act, 2025, and warns readers not to carry old section numbers or filing explanations into the new tax year without checking current guidance.
- The official Income Tax Department links are appropriate references for that distinction. No tax-content change is justified by this link review alone.
- The health-insurance note labels IRDAI as the official source and points readers to current circulars where newer rules may supersede older FAQs. No link replacement is justified solely by a 403 returned to the browser tool.

## Limitations and follow-up

1. This sample does not establish that every external link across all published pages works.
2. Browser-tool timeouts, redirects and 403 responses are recorded separately from confirmed broken links; do not automatically rewrite a link based on those outcomes.
3. For future tax/insurance content updates, compare the specific statement against the current regulator or tax-department source and preserve educational framing and professional-advice boundaries.
4. The existing site-integrity gate remains the authoritative automated check for local routes and fragments; it does not prove all external sources remain available or accurate.
5. A live AdSense account status, Google crawler access and approval cannot be inferred from these repository or web checks.

## Acceptance and decision

- Selected references were inspected in their page context and checked against official-source destinations.
- No confirmed broken URL or misleading anchor was identified in this sample.
- No public link changes are proposed.
- Keep live ads inactive. Do not submit another AdSense review until all remaining evidence and account-level requirements are satisfied and the user explicitly authorizes resubmission.
