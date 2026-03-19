import { getTenant, getTenantId } from '@/lib/tenant';
import AdminEditor from './AdminEditor';

export const metadata = {
  title: 'Tenant Config Admin',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const [tenant, tenantId] = await Promise.all([getTenant(), getTenantId()]);

  return <AdminEditor tenant={tenant} tenantId={tenantId} />;
}
