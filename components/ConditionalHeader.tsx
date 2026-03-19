'use client';

import { usePathname } from 'next/navigation';
import SiteHeader from './SiteHeader';

interface Props {
  logoUrl: string;
  logoHeight?: number;
  brandName: string;
  phone: string;
}

export default function ConditionalHeader(props: Props) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return <SiteHeader {...props} />;
}
