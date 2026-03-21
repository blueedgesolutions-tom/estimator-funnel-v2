'use client';

import { usePathname } from 'next/navigation';
import SiteFooter from './SiteFooter';

interface Props {
  companyName: string;
  phone: string;
  privacyPolicyUrl: string;
  stateLicense?: string;
}

export default function ConditionalFooter(props: Props) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return <SiteFooter {...props} />;
}
