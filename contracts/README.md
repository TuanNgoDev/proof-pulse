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
The eligibility witness remains untrusted and self-asserted, not a credential proof.
The metadata digest is supplied by the caller; no canonical metadata hashing exists yet.

## Prototype response commitments

`submitAnonymousResponsePrototype()` now accepts an open, self-asserted eligible
submission in the local contract runtime. Three private `Bytes<32>` witnesses supply
a participant secret, a response digest and a response salt. The circuit computes:

```text
nullifier = persistentHash(["proofpulse:nullifier:v1" padded to 32 bytes,
                            contract address, metadata digest, participant secret])
commitment = persistentCommit(["proofpulse:response:v1" padded to 32 bytes,
                               metadata digest, nullifier, response digest], response salt)
```

It rejects an existing nullifier, stores `responses[nullifier] = commitment`, and
increments `responseCount` in the same circuit without a checkpoint. Changing the
response digest or salt cannot bypass the duplicate guard. Different participant
secrets can submit independently. Deployment address binding prevents identical
metadata in separate deployments from producing the same nullifier; commitments
inherit that binding through the nullifier.

**One secret is not one person.** Anyone can select a new secret and claim eligibility;
there is no issuer credential, Sybil resistance or verified anonymous membership.
Use a high-entropy participant secret and fresh cryptographically random 32-byte
salt per response. The circuit checks neither entropy nor that the supplied digest
represents a valid survey answer. Weak/known salts permit guessing low-entropy answers;
weak secrets permit guessing pseudonyms. Deterministic test bytes are fixtures only.

Only nullifiers, salted commitments and the count are recorded publicly, not the
private secret, salt or response digest. The nullifier-to-commitment association,
count, transaction timing and network metadata are public/linkable. A commitment
is not encryption or retrievable response storage. No response opening, secure
collection, aggregation, retention policy or anonymity guarantee is implemented.
The web UI does not call this contract; its existing submission remains a simulation.

## Compile check

Install dependencies with `corepack pnpm install --frozen-lockfile`, then run
`corepack pnpm test:contract`. The runner requires compiler **0.26.0** and compiles
fresh source before executing the generated CommonJS contract against pinned
`@midnight-ntwrk/compact-runtime` **0.9.0**. On Windows it uses WSL Ubuntu's
`compactc` (never Windows' unrelated `compact.exe`); on Linux use `compactc` on PATH.
Generated artifacts stay in ignored `.compact-build/`.

Tests execute real constructors/circuits, unauthorized and commitment-as-secret
attempts, window boundaries, early-close denial, preserved dates, salted commitment
binding, per-secret duplicates, distinct participants, and deployment isolation.
Tests inspect actual public state/transcripts for the private fixture bytes and
replay a mutating submission transcript against unused, used, closed, expired and
different-deployment contexts. They also check a nonzero five-second block uncertainty
context and replay generated public transcripts inside/outside the window. These are
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
- Canonical response hashing, answer validation and encrypted off-chain response handling.
- Bind participant secrets to verified membership and validate atomicity on the network.
- Wallet, proof provider, generated bindings, deployment and network tests.
- Aggregate results with a reviewed disclosure policy.

References checked during this pass: [Compact reference](https://docs.midnight.network/compact/reference/compact-reference),
[explicit disclosure](https://docs.midnight.network/compact/reference/explicit-disclosure),
[kernel time](https://docs.midnight.network/compact/reference/ledger-adt#kernel),
[persistent commitments](https://docs.midnight.network/compact/standard-library/exports#persistentcommit),
and the [official secret-key lock pattern](https://github.com/LFDT-Minokawa/compact).
Online docs evolve; the executable compiler/runtime versions above are pinned.
Compact separates public ledger data from local witness data; `disclose` is an
explicit public boundary. No raw response text belongs in public ledger fields.
