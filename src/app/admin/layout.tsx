import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth';
import { Sidebar } from '@/components/admin/Sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = headers().get('x-pathname') ?? '';

  // The login page must remain publicly accessible
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const sessionToken = cookies().get('session')?.value;

  if (!sessionToken || !validateSession(sessionToken)) {
    redirect('/admin/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
