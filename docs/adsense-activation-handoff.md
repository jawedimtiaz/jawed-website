# AdSense Activation Handoff

Status: **Ready-gated / not activated**

This checklist is used only when Google reports **Ready** for the site. It does not authorize activation by itself.

## Entry gate

All of the following must be true before implementation begins:

- AdSense Sites status is **Ready**.
- The real publisher account values are available.
- The intended advertising mode is decided.
- Required Google-certified CMP configuration is available for applicable regions.
- The current eligible inventory has been re-reviewed.
- Privacy wording matches the actual advertising mode.
- No unrelated site redesign or navigation change is being introduced in the same activation change.

If any entry condition fails, remain pre-activation.

## Activation sequence

1. Apply the actual Google publisher configuration.
2. Apply the required consent/CMP configuration.
3. Re-check privacy and excluded routes.
4. Insert only the approved ad-slot boundaries.
5. Add only the CSP sources required by the actual Google implementation.
6. Add the exact `ads.txt` record when required by the account/integration.
7. Run all AdSense readiness validators.
8. Run site-integrity, production security, and deployment runtime validators.
9. Deploy.
10. Run production smoke and inspect ad/CMP network behavior.
11. Confirm publisher content, navigation, AI, and tools remain functional.

## Immediate rollback conditions

Rollback the activation change if any of these occur:

- Google configuration produces an unexpected runtime error.
- Consent state is bypassed or required consent is not respected.
- An excluded route receives advertising.
- Advertising blocks publisher content, navigation, AI, or tools.
- Ad failure causes unexpected layout movement or horizontal overflow.
- CSP must be weakened beyond the minimum domains required by the actual implementation.
- Production smoke, security, or site-integrity checks fail.
- An ad appears to be part of navigation, a control, a download, or an interactive tool.
- Any account value or publisher identifier is discovered to be incorrect.

Rollback means returning to the last known pre-activation commit and re-establishing the dormant state: no active ad runtime, no active ad slots, and no speculative advertising configuration.

## Post-activation evidence

Record the following evidence before considering activation complete:

| Evidence | Required record |
|---|---|
| Google Sites status | Exact status observed at activation; must be **Ready** |
| Activation commit | Full Git commit SHA |
| AdSense readiness | Aggregate validator result and individual validator results |
| Site integrity | Site-integrity validator result |
| Production security | Security-header validator result |
| Deployment runtime | Deployment-runtime validator result |
| Production smoke | Smoke result and timestamp |
| CSP | Final CSP diff reviewed against the actual Google implementation |
| `ads.txt` | Final state and exact account-confirmed record status |
| CMP/consent | Applicable-region behavior and consent result |
| Inventory | Final eligible/excluded route review |
| Placement | Final placement review |
| Functional regression | Publisher content, navigation, AI, tools and mobile layout confirmed |
| Rollback readiness | Pre-activation commit SHA retained |

Do not record publisher secrets or other unnecessary account credentials in repository documentation. Account-specific values belong only in the implementation location required by the actual Google integration.

This handoff is an implementation safeguard, not a statement of Google approval.
