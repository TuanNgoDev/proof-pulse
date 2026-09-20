import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ProofPulse — thoughtful feedback, private by design",
  description:
    "Wallet-signed anonymous surveys on Midnight Preprod.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <Link href="/" className="brand" aria-label="ProofPulse home">
            <span className="brand-mark" aria-hidden="true">
              p
            </span>
            ProofPulse<span className="brand-dot">.</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/preprod">Survey workspace</Link>
          </nav>
          <span className="demo-label">
            <span />
            Lace · Preprod
          </span>
        </header>
        {children}
        <footer className="site-footer">
          <span>A little proof. A lot more honesty.</span>
          <span>ProofPulse / Wallet-signed Midnight Preprod</span>
        </footer>
      </body>
    </html>
  );
}
