# ProofPulse

**Current progress: ~15%** — first development pass, intentionally incomplete.

ProofPulse is a verified anonymous survey and feedback prototype. It explores how
organizations could hear candid feedback from eligible participants without
collecting identities alongside individual responses.

## Implemented

- Responsive survey directory, status filters, details and creation form.
- Public survey model: title, description, eligibility, start/end dates.
- Input validation and Scheduled → Open → Closed lifecycle; closing is exclusive.
- Participant journey with explicit eligible/ineligible development scenarios.
- Response form gated by survey window and survey-bound demo eligibility.
- Private form state isolated from public metadata; simulated submit clears text.
- Domain interfaces for future participant proofs, nullifiers and atomic claims.
- Small Compact skeleton with compiler-checked metadata/schedule foundation.
- Loading, empty, missing-survey, form validation and route error states.
- Real domain tests using Node's test runner, TypeScript and ESLint checks.

## Privacy and prototype limits

Public survey metadata is held in a root React context. It never includes private
response text or participant identity. New surveys survive client-side navigation
but **reset on refresh**. They are not shared with other tabs or people. Seed surveys
use deliberately broad dates to keep the first-pass demo explorable.

Private response text lives only in the participant component. It is **not sent,
saved, encrypted or aggregated**; simulation validates and clears it. Use made-up
feedback only. Browser extensions, developer tools and the device can read form
data. No identity fields does not equal cryptographic anonymity. Ordinary page
requests still expose network metadata to the hosting infrastructure.

The development adapter lets you select an eligible/ineligible outcome. It does
not authenticate, check credentials, issue a proof or call a blockchain. A demo
result is intentionally not the production `ParticipantProof` type. Repeating
participation is possible. A completed UI state is not nullifier protection.

## Stack and organization

One Next.js 16 App Router application, React 19, TypeScript 5.9, Tailwind CSS 4,
ESLint 9 and pnpm 10.18.3. No separate backend or microservices.

```text
src/app/              routes and shared application shell
src/domain/survey/    public metadata, validation and lifecycle
src/domain/participant/ eligibility and response rules
src/domain/privacy/   future proof/nullifier protocol boundary
src/application/      in-memory survey session
src/infrastructure/   sample metadata and explicit development adapter
src/ui/               reusable visual elements and product screens
contracts/            small Compact prototype and integration notes
tests/                executable domain and boundary tests
```

Domain-centric, not strict DDD: only abstractions required by this pass are present.

## Local setup

Use Node.js 22 or newer (verified on Node 24) and Corepack/pnpm:

```sh
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Open http://localhost:3000. The manifest pins pnpm 10.18.3. If Corepack is unavailable,
`npx pnpm@10.18.3 install --frozen-lockfile` is an equivalent install command.
`.env.example` documents that no keys or environment variables are required.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

Run build separately from the development server because both use `.next`.
Date inputs use your device timezone; details use UTC. Browser time is only a
prototype clock, not an authoritative protocol timestamp.

## Try the main flow

1. Open `/`, filter surveys, and view `/surveys/workplace-pulse`.
2. Choose **Take part in this survey**.
3. Select **Not eligible participant**, then **Verify Eligibility**. Response stays locked.
4. Select **Eligible participant**, verify again, and enter made-up feedback.
5. **Simulate private submission** clears the text; nothing is collected.
6. Visit `/surveys/new`, create a survey, and inspect its details. Refresh to reset it.
7. `/surveys/campus-experience` is scheduled; `/surveys/product-listening` is closed.
8. `/privacy` explains the actual data boundaries.

## Midnight / Compact status

`contracts/survey.compact` was checked with Compact compiler 0.26.0, language 0.18.0,
using `--skip-zk`. It models single-survey creation, date ordering and an explicitly
untrusted eligibility witness. **Anonymous submission always rejects.**

Compilation is real; production membership proof verification, proof generation,
wallet connection, deployment, and network interaction are **not implemented**.
No raw response is put on a ledger. See [contract notes](contracts/README.md).

Reference material: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
and [Compact language reference](https://docs.midnight.network/compact/reference/compact-reference).

## Next milestones (not implemented)

1. Authenticate organizers and persist canonical survey metadata.
2. Replace the development scenario with reviewed eligible-group proof constraints.
3. Bind private response commitments to survey-scoped nullifiers atomically.
4. Integrate wallet, proof provider and deployment with adversarial contract tests.
5. Add secure collection and aggregate publication with an explicit disclosure policy.

Production nullifiers, demographic analytics, anonymous follow-ups, and complex
results dashboards are deliberately outside this first pass.
