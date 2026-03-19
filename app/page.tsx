import { getTenant } from '@/lib/tenant';
import FunnelContent from '@/components/FunnelContent';

export default async function Home() {
  const tenant = await getTenant();
  return <FunnelContent tenant={tenant} />;
}
