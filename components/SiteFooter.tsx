import Image from 'next/image';

interface Props {
  logoUrl: string;
  companyName: string;
  privacyPolicyUrl: string;
  stateLicense?: string;
}

function Dot() {
  return <span className="site-footer-dot">·</span>;
}

export default function SiteFooter({ logoUrl, companyName, privacyPolicyUrl, stateLicense }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-logo">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={companyName}
            height={300}
            width={600}
            className="site-footer-logo-img"
            style={{ height: 'var(--logo-height)', width: 'auto' }}
          />
        ) : (
          <span className="site-footer-logo-text">{companyName}</span>
        )}
      </div>
      <div className="site-footer-row">
        {stateLicense && (
          <>
            <span>License #{stateLicense}</span>
            <Dot />
          </>
        )}
        <a href={privacyPolicyUrl}>Privacy Policy</a>
        <Dot />
        <span>© {year} {companyName}</span>
      </div>
    </footer>
  );
}
