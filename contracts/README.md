# ProofPulse Compact contract

The single-survey contract is release-compiled with Compact compiler **0.31.1**, language **0.23.0**, and `@midnight-ntwrk/compact-runtime` **0.16.0**.

```sh
corepack pnpm test:contract
corepack pnpm contract:compile
```

The full compile creates ignored prover, verifier, and ZKIR assets in `.compact-build/`. `contracts/preprod-adapter.mjs` is the public ESM boundary used by the private deployment runner.

## Contract flow

- The constructor seals a commitment to the private organizer secret.
- `createSurvey(digest, start, end)` is organizer-only and initializes one immutable survey window.
- Before the start, the organizer may call `enrollParticipant(commitment)` for nonzero, unique participant commitments.
- During the start-inclusive/end-exclusive window, `submitAnonymousResponse()` requires an enrolled address- and survey-bound participant secret.
- A response circuit atomically stores one salted response commitment per participant nullifier and increments `responseCount`.
- `closeSurvey()` is organizer-only, open-only, and irreversible.

Survey timing, metadata digest, enrollment commitments, response nullifiers/commitments, counts, and transaction metadata are public and linkable. Organizer/participant secrets, response digest, and response salt are private witnesses. Private transcript outputs must never be logged or published.

Enrollment is organizer approval, not verified human uniqueness. The contract does not validate response semantics, open commitments, aggregate answers, recover secrets, or provide organizational identity. The hosted survey UI remains database-backed and does not submit Midnight transactions.

The three indexer-verified addresses, deployment transactions, smoke calls, public states, and exact toolchain versions are published in [`deployments/preprod.json`](../deployments/preprod.json).
