import { Shield } from "./icons";

export function PrivacyBand() {
  return <section className="privacy-band" aria-label="Privacy approach">
    <div><strong>Your perspective matters. Your identity doesn’t.</strong><p className="small muted">No identity requested. Eligibility is simulated in this demo.</p></div>
    <div className="privacy-points"><span><Shield />Identity: Hidden</span><span><Shield />Response: Local only</span></div>
  </section>;
}
