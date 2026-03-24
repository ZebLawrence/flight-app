import Link from 'next/link';
import TenantForm from '@/components/admin/TenantForm';

export default function NewTenantPage() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link
          href="/admin/tenants"
          className="text-sm text-blue-600 hover:underline"
        >
          Tenants
        </Link>
        <span className="text-gray-400 text-sm">/</span>
        <span className="text-sm text-gray-500">New</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create tenant</h1>
      <TenantForm />
    </div>
  );
}
