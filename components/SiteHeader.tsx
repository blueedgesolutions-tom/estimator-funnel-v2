import Image from 'next/image';

interface SiteHeaderProps {
  logoUrl: string;
  logoHeight?: number;
  brandName: string;
  phone: string;
}

export default function SiteHeader({
  logoUrl,
  brandName,
  phone,
}: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-logo">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={brandName}
            height={36}
            width={180}
            className="site-header-logo-img"
            style={{ height: 'var(--logo-height)', width: 'auto' }}
          />
        ) : (
          <span className="site-header-logo-text">{brandName}</span>
        )}
      </div>

      {phone && (
        <a href={`tel:${phone.replace(/\D/g, '')}`} className="site-header-phone">
          {phone}
        </a>
      )}
    </header>
  );
}
