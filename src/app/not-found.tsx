import Link from "next/link";
export default function NotFound() { return <main id="main" className="container"><div className="empty"><h1>This page is a little too private.</h1><p className="muted">We couldn’t find the page you were looking for.</p><Link href="/" className="button">Back to surveys</Link></div></main>; }
