import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SurveySession } from "@/application/survey-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ProofPulse — thoughtful feedback, private by design",
  description: "A development prototype for verified anonymous surveys on Midnight.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <Link href="/" className="brand" aria-label="ProofPulse home"><span className="brand-mark" aria-hidden="true">p</span>ProofPulse<span className="brand-dot">.</span></Link>
      <nav aria-label="Main navigation"><Link href="/">Surveys</Link><Link href="/privacy">How privacy works</Link></nav>
      <span className="demo-label"><span />Local demo</span>
    </header>
    <SurveySession initialNow={Date.now()}>{children}</SurveySession>
    <footer className="site-footer"><span>A little proof. A lot more honesty.</span><span>ProofPulse / Midnight prototype · No live network</span></footer>
  </body></html>;
}
