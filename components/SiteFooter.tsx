interface Props {
  companyName: string;
  phone: string;
  privacyPolicyUrl: string;
  stateLicense?: string;
}

function Dot() {
  return <span className="site-footer-dot">·</span>;
}

export default function SiteFooter({ companyName, phone, privacyPolicyUrl, stateLicense }: Props) {
  const year = new Date().getFullYear();

  if (stateLicense) {
    return (
      <footer className="site-footer">
        <div className="site-footer-row">
          <span>{companyName}</span>
          <Dot />
          <a href={`tel:${phone.replace(/\D/g, '')}`}>{phone}</a>
          <Dot />
          <span>License #{stateLicense}</span>
        </div>
        <div className="site-footer-row site-footer-row--sub">
          <a href={privacyPolicyUrl}>Privacy Policy</a>
          <Dot />
          <span>© {year} {companyName}</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="site-footer">
      <div className="site-footer-row">
        <span>{companyName}</span>
        <Dot />
        <a href={`tel:${phone.replace(/\D/g, '')}`}>{phone}</a>
        <Dot />
        <a href={privacyPolicyUrl}>Privacy Policy</a>
        <Dot />
        <span>© {year} {companyName}</span>
      </div>
    </footer>
  );
}
