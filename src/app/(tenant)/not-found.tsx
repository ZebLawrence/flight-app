import Link from 'next/link';

export default function TenantNotFoundPage() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>The page you requested could not be found.</p>
      <Link href="/">Go to homepage</Link>
    </main>
  );
}
