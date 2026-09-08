import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ProofPulse — thoughtful feedback, private by design",
  description: "A development prototype for verified anonymous surveys on Midnight.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
