# ProofPulse

**Live web preview:** https://proof-pulse-gamma.vercel.app

Hosted on Vercel with a dedicated Neon database. Survey metadata persists across
reloads in the same browser workspace. Hosting is live; Midnight proofs and response
submission remain development demonstrations, not a live blockchain integration.

**Current progress: ~20%** — a rough product-scope estimate, not measured completion.
Persisted survey lifecycle management now works locally; most proof, collection,
authentication and aggregation work remains. The hosted preview above has not been
updated by this iteration.

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
- PostgreSQL/Drizzle persistence for survey metadata in an anonymous browser workspace.
- Server Action validation, parameterized queries, cookie isolation and tracked migrations.
- Edit not-yet-open surveys and close Open surveys early with confirmation/cancellation.
- Preserve the scheduled end and record early closure separately; closed surveys cannot reopen.
- Recheck persisted lifecycle before demo eligibility and simulated submission, including stale tabs.

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
queries; the browser cannot supply a workspace id. No response or participant identity
column exists. Seed metadata is inserted transactionally once per workspace and uses
deliberately broad dates to keep the first-pass demo explorable.

Private response text lives only in the participant component. It is **not sent,
saved, encrypted or aggregated**; simulation validates and clears it. Use made-up
feedback only. Browser extensions, developer tools and the device can read form
data. No identity fields does not equal cryptographic anonymity. Ordinary page
requests still expose network metadata to the hosting infrastructure.

Eligibility and simulated submission send only a survey identifier and a lifecycle
check operation to the server, never the response text or participant information.
The check reads the current workspace-scoped row under the same lock used by edits
and early closure. Database time is read after acquiring that lock. A closed survey
or failed storage check prevents completion; stale metadata refreshes after rejection.
This is a point-in-time lifecycle check, not a response receipt or proof.

The development adapter lets you select an eligible/ineligible outcome. It does
not authenticate, check credentials, issue a proof or call a blockchain. A demo
result is intentionally not the production `ParticipantProof` type. Repeating
participation is possible. A completed UI state is not nullifier protection.

## Stack and organization

One Next.js 16 App Router application, React 19, TypeScript 5.9, Tailwind CSS 4,
ESLint 9, pnpm 10.18.3, PostgreSQL (`pg`) and Drizzle ORM. No separate backend or microservices.

```text
src/app/              routes and shared application shell
src/domain/survey/    public metadata, validation and lifecycle
src/domain/participant/ eligibility and response rules
src/domain/privacy/   future proof/nullifier protocol boundary
src/application/      async survey session, server actions and input boundary
src/infrastructure/   server-only database, schema, seed data and demo adapter
src/ui/               reusable visual elements and product screens
contracts/            small Compact prototype and integration notes
tests/                executable domain and boundary tests
drizzle/              versioned SQL migrations and schema snapshots
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
`drizzle/0001_unique_dazzler.sql` adds nullable `closed_at`; it preserves existing
survey dates and rows. This iteration validated it on an isolated development
database branch; production migration/deployment remains a separate operator step.
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
concurrent close attempts, preserved end dates, and stale lifecycle-check rejection.
It cleans up only its two
random test workspaces. The schema must already be migrated. Unit tests alone do
not establish that a live database migration or deployment has succeeded.

For a browser smoke check: create a survey, reload and reopen it; then open its URL
in another browser/incognito session and confirm it is unavailable there. Responses
remain component-local and the simulation still clears them without sending them.

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
5. **Simulate private submission** clears the text; nothing is collected.
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

`contracts/survey.compact` was checked with Compact compiler 0.26.0, language 0.18.0,
using `--skip-zk`. It models single-survey creation, date ordering and an explicitly
untrusted eligibility witness. **Anonymous submission always rejects.**

Compilation is real; production membership proof verification, proof generation,
wallet connection, deployment, and network interaction are **not implemented**.
No raw response is put on a ledger. See [contract notes](contracts/README.md).

Reference material: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
and [Compact language reference](https://docs.midnight.network/compact/reference/compact-reference).

## Next milestones (not implemented)

1. Add real organizer authentication, recovery, retention cleanup and abuse/rate limits.
2. Replace the development scenario with reviewed eligible-group proof constraints.
3. Bind private response commitments to survey-scoped nullifiers atomically.
4. Integrate wallet, proof provider and deployment with adversarial contract tests.
5. Add secure collection and aggregate publication with an explicit disclosure policy.

Production nullifiers, demographic analytics, anonymous follow-ups, and complex
results dashboards are deliberately outside this first pass.

Persistence does not complete the Midnight protocol or make this demo production-ready.
Review access controls, quotas, retention and database role privileges before allowing
untrusted public traffic. [Drizzle PostgreSQL setup](https://orm.drizzle.team/docs/get-started/postgresql-new)
and [Vercel pool lifecycle](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package)
inform the persistence implementation.
