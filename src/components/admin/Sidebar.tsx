import Link from 'next/link';
import { LogoutButton } from './LogoutButton';

export function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <span className="text-lg font-semibold text-gray-900">Admin</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <Link
          href="/admin/tenants"
          className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
        >
          Tenants
        </Link>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <LogoutButton />
      </div>
    </aside>
  );
}
