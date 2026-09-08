import Link from "next/link";
import { Arrow } from "@/ui/icons";

export default function PrivacyPage() {
  return (
    <main id="main" className="container">
      <Link href="/" className="back-link">
        <Arrow back />
        All surveys
      </Link>
      <article className="prose">
        <h1>Privacy, without the fine print.</h1>
        <p style={{ marginTop: 22 }}>
          ProofPulse is exploring a simple idea: prove you belong in a
          conversation without having to introduce yourself. This first pass is
          a development prototype, not a secure survey service.
        </p>
        <h2>What this demo actually does</h2>
        <p>
          Survey titles, descriptions, eligibility rules and dates are public
          metadata. They are saved in PostgreSQL and scoped to an anonymous
          browser workspace. An HttpOnly cookie acts as its access key; only a
          hash of that key is stored in the database. Surveys survive refreshes
          while that cookie remains. Other browsers receive separate workspaces.
          No account system or organization authorization is connected.
        </p>
        <p>
          The workspace cookie links visits and survey metadata from the same
          browser. It is a bearer credential, not a real identity or
          cryptographic anonymity. Clearing it loses access; saved metadata is
          not automatically deleted. Database operators can read survey
          metadata. Use made-up information only.
        </p>
        <p>
          Your response is kept separately, in the response form’s React state.
          The simulate button validates and clears it. There is no collection,
          storage, analytics, result publication or network submission of your
          response.
        </p>
        <h2>What “verified” means here</h2>
        <p>
          Nothing about your real eligibility is verified. The development
          scenario selector simply returns eligible or ineligible. It does not
          generate a zero-knowledge proof or contact Midnight. The interface
          clearly marks this as a demo outcome.
        </p>
        <h2>What “private” does not mean</h2>
        <p>
          This demo does not encrypt form text. Your browser, extensions,
          device, developer tools, and anyone looking at your screen can access
          it. Not asking for a name is not a cryptographic anonymity guarantee.
          Use made-up feedback only.
        </p>
        <p>
          No response data is intentionally sent over the network by this app.
          Ordinary web navigation still exposes network metadata to the hosting
          infrastructure. No production anonymity claim is made.
        </p>
        <h2>What comes next</h2>
        <p>
          Real eligible-group proofs, survey-scoped nullifiers, atomic duplicate
          prevention, secure response handling and eventually verifiable
          aggregates. None of those are implemented here. You can repeat this
          demo flow; its completion screen is not duplicate protection.
        </p>
        <div className="notice">
          The included Compact foundation compiles with proving-key generation
          skipped. The response circuit fails closed. No contract has been
          deployed and no chain transaction occurs.
        </div>
      </article>
    </main>
  );
}
