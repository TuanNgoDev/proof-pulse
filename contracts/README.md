# Compact foundation — not a deployed application

`survey.compact` targets language **0.18.0**, checked with Compact compiler **0.26.0**.

The single-survey prototype binds initialization and early closure to possession
of a private organizer secret. The constructor seals a domain-separated persistent
hash of that secret; a caller cannot claim an existing deployment by initializing
first or by supplying the public commitment as a credential. This is secret-key
authorization, not verified organizational identity. Use a fresh cryptographically
random 32-byte secret per deployment; production custody/recovery is not implemented.
No wallet public-key claim is used as authentication.

Participation checks kernel block time in seconds since Unix epoch: start inclusive,
end exclusive. Closure is organizer-only, open-only and irreversible, retaining the
scheduled end. Both participant entry points share the same open-state guard.
The eligibility witness remains untrusted. The submission circuit
**always rejects**; it cannot collect a response. The witness is untrusted and
self-asserted, not a credential proof. The metadata digest is supplied by the caller;
no canonical metadata hashing exists yet.

## Compile check

Install dependencies with `corepack pnpm install --frozen-lockfile`, then run
`corepack pnpm test:contract`. The runner requires compiler **0.26.0** and compiles
fresh source before executing the generated CommonJS contract against pinned
`@midnight-ntwrk/compact-runtime` **0.9.0**. On Windows it uses WSL Ubuntu's
`compactc` (never Windows' unrelated `compact.exe`); on Linux use `compactc` on PATH.
Generated artifacts stay in ignored `.compact-build/`.

Tests execute real constructors/circuits, unauthorized and commitment-as-secret
attempts, window boundaries, early-close denial, preserved dates and fail-closed
submission. They also check a nonzero five-second block uncertainty context and
replay actual generated public transcripts inside/outside the window. These are
local VM checks, not consensus acceptance or a production time policy guarantee.

With the compatible compiler on PATH:

```sh
compactc --skip-zk contracts/survey.compact /tmp/proof-pulse-compact-check
```

On Windows with that compiler installed in WSL Ubuntu:

```powershell
wsl -d Ubuntu -- bash -lc 'compactc --skip-zk /mnt/f/stellar/duan2-midnight/contracts/survey.compact /tmp/proof-pulse-compact-check'
```

`--skip-zk` checks compilation but skips proving-key generation. It is not a ZK
proof, a deployed transaction, a circuit-security audit, or a network test.
Generated files are not required by the browser application and are not committed.

## Integration still required

- Organizer key custody/recovery and organizational identity, canonical metadata digest.
- Issuer-bound eligible-group membership constraints, not a Boolean witness.
- Validate kernel time behavior and transaction validity under real network conditions.
- Private response commitment and encrypted off-chain response handling.
- Survey-scoped participant nullifier and atomic duplicate protection.
- Wallet, proof provider, generated bindings, deployment and network tests.
- Aggregate results with a reviewed disclosure policy.

References checked during this pass: [Compact reference](https://docs.midnight.network/compact/reference/compact-reference),
[explicit disclosure](https://docs.midnight.network/compact/reference/explicit-disclosure),
[kernel time](https://docs.midnight.network/compact/reference/ledger-adt#kernel),
and the [official secret-key lock pattern](https://github.com/LFDT-Minokawa/compact).
Online docs evolve; the executable compiler/runtime versions above are pinned.
Compact separates public ledger data from local witness data; `disclose` is an
explicit public boundary. No raw response text belongs in public ledger fields.
