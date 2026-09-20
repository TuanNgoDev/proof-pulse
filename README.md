# ProofPulse

> **Level 4 reviewer packet**
>
> [Open the product](https://proof-pulse-midnight.onrender.com) · [Use the Midnight Preprod console](https://proof-pulse-midnight.onrender.com/preprod) · [Follow the product on X](https://x.com/TuanAR205)

## Submission evidence

1. **Public source:** [TuanNgoDev/proof-pulse](https://github.com/TuanNgoDev/proof-pulse)
2. **Live Preprod MVP:** [ProofPulse on Render](https://proof-pulse-midnight.onrender.com) with the [Lace-signed contract console](https://proof-pulse-midnight.onrender.com/preprod).
3. **Contract:** [`979d1dcedf1a54ffc822b445d47e9dd12f77924e2e872eabd1bbb3a81f8950da`](https://explorer.preprod.midnight.network/contracts/stream/979d1dcedf1a54ffc822b445d47e9dd12f77924e2e872eabd1bbb3a81f8950da), deployed in [transaction `005d0e52...65ce`](https://explorer.preprod.midnight.network/transactions/005d0e529cea7f4039bf764c2d29481b32979becb1ea8b1356f4c24d4354ae65ce). The complete record is in [`deployments/preprod.json`](deployments/preprod.json).
4. **Documentation:** [setup](#local-setup), [usage walkthrough](#try-the-main-flow), [privacy boundaries](#privacy-and-prototype-limits), and [Compact notes](contracts/README.md).
5. **CI/CD:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) builds the web app and Compact contract and runs lint, type checks, and tests; Render auto-deploys successful pushes to `main`.
6. **Product profile:** [@TuanAR205](https://x.com/TuanAR205).
7. **Commit history:** [42+ meaningful commits](https://github.com/TuanNgoDev/proof-pulse/commits/main/), exceeding the required 15.
8. **Demo video:** **Pending** - the walkthrough link will be added after recording.

### Level 4 checklist

- [x] Public GitHub repository with full documentation
- [x] Live Preprod demo and verifiable contract address
- [x] CI workflow committed to the product repository
- [x] Public product X profile linked
- [ ] Demo video - **Pending**
- [x] Minimum 15 meaningful commits

Hosted on Render with a dedicated Neon database. Survey metadata persists across
reloads in the same browser workspace. The browser workflow remains off-chain, while
three independent Compact contract instances and proof-backed smoke transactions are
verified on Midnight Preprod.

ProofPulse is a verified anonymous survey and feedback prototype. It explores how
organizations could hear candid feedback from eligible participants without
collecting identities alongside individual responses.

## Implemented

- Responsive survey directory, status filters, details and creation form.
- Public survey model: title, description, eligibility, start/end dates.
- Input validation and Scheduled → Open → Closed lifecycle; closing is exclusive.
- Participant journey with explicit eligible/ineligible development scenarios.
- Response form gated by survey window and survey-bound demo eligibility.
- Browser-side salted response commitments; raw text is cleared without entering a request body or database.
- Stable per-browser, per-survey participant secrets and survey-scoped nullifiers with atomic duplicate rejection.
- PostgreSQL response receipts containing only commitment, nullifier, receipt ID, timestamp, and aggregate count.
- Domain interfaces for future participant proofs and ledger-backed atomic claims.
- Compact contract with constructor-bound organizer authorization, explicit participant
  enrollment, kernel-time windows, irreversible closure, salted response commitments,
  and per-secret duplicate guards. It is release-compiled and separately deployed to
  Midnight Preprod; the hosted UI does not call it.
- Loading, empty, missing-survey, form validation and route error states.
- Real domain tests using Node's test runner, TypeScript and ESLint checks.
- PostgreSQL/Drizzle persistence for survey metadata in an anonymous browser workspace.
- Server Action validation, parameterized queries, cookie isolation and tracked migrations.
- Edit not-yet-open surveys and close Open surveys early with confirmation/cancellation.
- Preserve the scheduled end and record early closure separately; closed surveys cannot reopen.
- Atomically recheck persisted lifecycle before accepting a response commitment, including stale tabs.

## Privacy and prototype limits

Public survey metadata is stored in PostgreSQL, loaded into a root React context,
and scoped to a browser workspace. **Surveys survive refreshes** while its HttpOnly
cookie remains. Tabs in the same browser share the workspace; another browser gets
its own seeded workspace. The database stores a SHA-256 digest of a random 256-bit
cookie token, never the raw token. The cookie is host-only, SameSite=Strict, Secure
in production, and lasts up to one year. Clearing it loses access but does not delete
database rows. No account recovery or automatic retention cleanup exists yet.

The cookie is a bearer credential and links browser visits; this is not strong
authentication, end-to-end encryption, or cryptographic anonymity. Database operators
can read survey metadata. All data access is through server-only workspace-scoped
queries; the browser cannot supply a workspace id. No raw response or participant identity
column exists. Seed metadata is inserted transactionally once per workspace and uses
deliberately broad dates to keep the hosted demo explorable.

Private response text lives only in the participant component. The browser trims it,
combines it with a fresh private salt, and creates a SHA-256 commitment. The server
receives only that commitment and a survey-scoped nullifier, then clears the form.
The salt and stable browser-local participant secret are never transmitted. Use made-up
feedback only: browser extensions, developer tools and the device can still read form
data, and low-level network metadata remains visible to the hosting infrastructure.

Submission sends only the survey identifier, commitment, and nullifier. The server locks
the current workspace-scoped survey, reads database time, verifies the Open window, and
inserts the opaque receipt in the same transaction. Unique constraints reject concurrent
reuse of either the nullifier or commitment. Closed surveys fail before insertion.

The development adapter lets you select an eligible/ineligible outcome. It does
not authenticate, check credentials, issue a proof or call a blockchain. A demo
result is intentionally not the production `ParticipantProof` type. The hosted duplicate
guard is browser-pseudonymous, not one-person-one-response: clearing local storage or using
another browser creates a new secret and nullifier.

## Stack and organization

One Next.js 16 App Router application, React 19, TypeScript 5.9, Tailwind CSS 4,
ESLint 9, pnpm 10.18.3, PostgreSQL (`pg`) and Drizzle ORM. No separate backend or microservices.

```text
src/app/              routes and shared application shell
src/domain/survey/    public metadata, validation and lifecycle
src/domain/participant/ eligibility and response rules
src/domain/privacy/   client commitment/nullifier preparation and future proof boundary
src/application/      async survey session, server actions and input boundary
src/infrastructure/   server-only database, schema, seed data and demo adapter
src/ui/               reusable visual elements and product screens
contracts/            small Compact prototype and integration notes
tests/                executable domain and boundary tests
drizzle/              survey and opaque response-receipt migrations
```

Domain-centric, not strict DDD: only abstractions required by this pass are present.

## Local setup

Use Node.js 22 or newer (verified on Node 24) and Corepack/pnpm:

```sh
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm db:migrate
corepack pnpm dev
```

Open http://localhost:3000. The manifest pins pnpm 10.18.3. If Corepack is unavailable,
`npx pnpm@10.18.3 install --frozen-lockfile` is an equivalent install command.
Before migration or startup, set server-only values in ignored `.env.local` or your
environment (see `.env.example`):

- `DATABASE_URL`: pooled Neon/PostgreSQL connection for the running app.
- `DATABASE_URL_UNPOOLED`: direct connection to the same database for migrations.
- `TEST_DATABASE_URL`: optional direct connection to a migrated disposable test database.

Do not prefix database secrets with `NEXT_PUBLIC_`. On Vercel, set `DATABASE_URL`
for the intended environments. Keep the direct migration credential in the trusted
operator environment; it need not be deployed. The module-scoped pool is capped at
three connections and uses `attachDatabasePool` when `VERCEL` is set. No schema changes
are run during application startup or builds.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

`pnpm lint`, `pnpm test`, `pnpm typecheck` and `pnpm build` do not need database
credentials. The UI reports storage unavailability if configuration/connection is
missing; it never silently saves to browser memory. `/privacy` remains readable.

## Schema and database verification

`src/infrastructure/database/schema.ts` is the source of truth. Apply the committed
tracked migrations via `pnpm db:migrate` using the direct connection. Migration
`drizzle/0001_unique_dazzler.sql` adds nullable `closed_at`; `0002_thankful_hardball.sql`
adds opaque response receipts and uniqueness constraints. Both preserve existing survey
rows. The latest migration and duplicate-concurrency check were applied to the configured
Neon database during this development pass.
For future schema changes, edit the Drizzle schema, run `pnpm db:generate`, review the
generated SQL and apply it to a disposable branch before production. Do not use
ad hoc DDL or `drizzle-kit push` for deployment. No external database is provisioned
by these scripts.

```sh
pnpm db:generate
pnpm db:migrate
pnpm test:db
```

`test:db` requires `TEST_DATABASE_URL` and fails explicitly if absent. It tests
concurrent one-time seeding, persisted reloads, cross-workspace isolation, private
field rejection, a real database date constraint, and concurrent quota enforcement.
It also checks scheduled-only edits, future-start validation, open-only closure,
concurrent close attempts, preserved end dates, stale lifecycle rejection, opaque receipt
storage, public counts, and concurrent nullifier rejection.
It cleans up only its two
random test workspaces. The schema must already be migrated. Unit tests alone do
not establish that a live database migration or deployment has succeeded.

For a browser smoke check: create a survey, reload and reopen it; then open its URL
in another browser/incognito session and confirm it is unavailable there. Submit made-up
feedback and verify that only the receipt/count survives navigation, never the text.

Workspaces are capped at 500 surveys (including the four examples). A database row
lock serializes creates in the same workspace so concurrent requests cannot bypass
the cap; reads return at most 500 surveys. Server Action bodies are limited to 32 KB,
and Next.js supplies the action Origin/Host protection. Anonymous workspace creation
is not globally rate-limited yet. `/api/health` checks database/schema readiness and
returns a generic 200/503 response without connection information.

With a production build running on `http://localhost:3112` and `TEST_DATABASE_URL`
pointing to that same approved test database, run `pnpm test:http`. This makes real
Server Action requests, checks cookie flags, persistence/isolation, missing-cookie
denial, private-field rejection, cross-origin protection and the request size limit.
It also exercises edit/close/check actions, denied ownership and lifecycle transitions,
and persisted edits after reload. `TEST_BASE_URL` can select another localhost port
(for example `http://localhost:3212`); non-localhost targets are rejected.
It discovers action identifiers from the current local build and deletes only the
test workspaces it creates. It is intentionally a localhost-only check, not a
production traffic generator.

Run build separately from the development server because both use `.next`.
Date inputs use your device timezone; details use UTC. Browser time drives displayed
status, but persisted lifecycle actions use database time. Neither is a blockchain
protocol timestamp.

## Try the main flow

1. Open `/`, filter surveys, and view `/surveys/workplace-pulse`.
2. Choose **Take part in this survey**.
3. Select **Not eligible participant**, then **Verify Eligibility**. Response stays locked.
4. Select **Eligible participant**, verify again, and enter made-up feedback.
5. **Submit private commitment** clears the text and returns an opaque receipt. Repeating
   from the same browser secret is rejected; the detail page shows only the count.
6. Visit `/surveys/new`, create a survey, and inspect its details. Refresh to verify persistence.
7. `/surveys/campus-experience` is scheduled; `/surveys/product-listening` is closed.
8. `/privacy` explains the actual data boundaries.
9. Create a future-dated survey, choose **Edit survey**, change its public metadata,
   then **Save changes**. **Cancel editing** returns without saving.
10. On an Open survey choose **Close survey early** and confirm (or cancel).
    The original scheduled end stays visible alongside the actual early-close time.
    A participant tab opened before closing must fail its next eligibility/submit
    check, without sending its response. Closed surveys cannot be edited or reopened.

## Midnight / Compact status

`contracts/survey.compact` is release-compiled with **Compact compiler 0.31.1,
language 0.23.0, and runtime 0.16.0**. The full compile emits prover, verifier, and
ZKIR assets. Seventeen contract/runtime tests cover organizer authorization,
participant enrollment, time windows, salted commitments, privacy boundaries, and
replay rejection.

### Verified Preprod matrix

| Wallet | Contract stream | Deploy transaction | Smoke transaction |
|---|---|---|---|
| 02 | [`979d1dce…50da`](https://explorer.preprod.midnight.network/contracts/stream/979d1dcedf1a54ffc822b445d47e9dd12f77924e2e872eabd1bbb3a81f8950da) | [`005d0e52…65ce`](https://explorer.preprod.midnight.network/transactions/005d0e529cea7f4039bf764c2d29481b32979becb1ea8b1356f4c24d4354ae65ce) | [`createSurvey`](https://explorer.preprod.midnight.network/transactions/008ffb3aa75038a596179e7d7c43854efc3a28662dc2473ff2e5fa81d224c56796) |
| 03 | [`66d31e19…ea48`](https://explorer.preprod.midnight.network/contracts/stream/66d31e19d1ffbd01d5dacf79cda89ab8d626fc1d07b819e42d25e9d5cdc3ea48) | [`009dd30a…a54b`](https://explorer.preprod.midnight.network/transactions/009dd30a13b070bb803d30433d5aab0e4048d36c62eaaba15882944feceaeea54b) | [`createSurvey`](https://explorer.preprod.midnight.network/transactions/005af8e1f6872aaf3da6e11a29310c2d2f554fc9977eebee6a2ab3216524744759) |
| imported | [`cf91a47c…0a0e`](https://explorer.preprod.midnight.network/contracts/stream/cf91a47c4a8c085aa906dce5b9d9ccde715daa3a5f73e58db88f766db2e30a0e) | [`0080f684…295f`](https://explorer.preprod.midnight.network/transactions/0080f68484e402070b48d05e9bdecfe3383b149f17e9e385df8e1bc35d6f6b295f) | [`create → enroll → submit`](https://explorer.preprod.midnight.network/transactions/00111f76548d8ee9180aa6289be1f0799181085ebb7eef52c0153d45afc544d049) |

All eight listed deployment/smoke transactions were read back from the indexer as
`SucceedEntirely`. Exact wallet addresses, block evidence, fees, and aggregate public
state are in [deployments/preprod.json](deployments/preprod.json).

The canary response was accepted only after the on-chain start time and produced one
response commitment. **This is not one-person-one-response:** organizer enrollment is
approval of a secret commitment, not verified human uniqueness. Public timing,
nullifiers, and counts remain linkable; raw response content is never placed on the
ledger. The hosted UI persists compatible opaque receipts but still does not call the
Compact contract. See [contract notes](contracts/README.md).

Reference material: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
and [Compact language reference](https://docs.midnight.network/compact/reference/compact-reference).

## Next milestones (not implemented)

1. Integrate organizer authorization with the UI; add account identity, key custody/recovery,
   retention cleanup and abuse/rate limits.
2. Replace the development scenario with reviewed eligible-group proof constraints.
3. Bind participant secrets to verified credentials; move the tested database duplicate
   guard to ledger-backed commitment/nullifier claims.
4. Integrate the hosted UI with a supported wallet and proof provider; retain the adversarial contract tests at that boundary.
5. Add secure collection and aggregate publication with an explicit disclosure policy.

Production nullifiers, demographic analytics, anonymous follow-ups, and complex
results dashboards remain outside the current scope.

Persistence does not complete the Midnight protocol or make this demo production-ready.
Review access controls, quotas, retention and database role privileges before allowing
untrusted public traffic. [Drizzle PostgreSQL setup](https://orm.drizzle.team/docs/get-started/postgresql-new)
and [Vercel pool lifecycle](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package)
inform the persistence implementation.
