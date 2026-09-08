# Compact foundation — not a deployed application

`survey.compact` targets language **0.18.0**, checked with Compact compiler **0.26.0**.

The small single-survey prototype models public metadata initialization, a valid
start/end window, and an eligibility witness boundary. Its submission circuit
**always rejects**; it cannot collect a response. The witness is untrusted and
self-asserted, not a credential proof. The metadata digest is supplied by the caller;
no canonical metadata hashing or organizer authentication exists yet.

## Compile check

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

- Authenticated organizer and immutable survey policy, canonical metadata digest.
- Issuer-bound eligible-group membership constraints, not a Boolean witness.
- Trusted network time and start/end enforcement in the submission circuit.
- Private response commitment and encrypted off-chain response handling.
- Survey-scoped participant nullifier and atomic duplicate protection.
- Wallet, proof provider, generated bindings, deployment and network tests.
- Aggregate results with a reviewed disclosure policy.

References checked during this pass: [Compact reference](https://docs.midnight.network/compact/reference/compact-reference),
[explicit disclosure](https://docs.midnight.network/compact/reference/explicit-disclosure).
Compact separates public ledger data from local witness data; `disclose` is an
explicit public boundary. No raw response text belongs in public ledger fields.
