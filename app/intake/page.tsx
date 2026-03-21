import { getTenant, getTenantId } from '@/lib/tenant';
import IntakeForm from './IntakeForm';

export const metadata = {
  title: 'Pricing Setup',
  robots: { index: false, follow: false },
};

export default async function IntakePage() {
  const [tenant, tenantId] = await Promise.all([getTenant(), getTenantId()]);

  return (
    <IntakeForm
      tenantId={tenantId}
      brandName={tenant.config.brand_name}
      logoUrl={tenant.config.logo_url}
      catalog={tenant.catalog}
    />
  );
}
