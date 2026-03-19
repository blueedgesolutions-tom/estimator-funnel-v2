import { getTenant } from '@/lib/tenant';

export default async function PrivacyPage() {
  const tenant = await getTenant();
  const { brand_name, company_name, contact_email, contact_phone, city, area } = tenant.config;
  const location = area ?? city;
  const effectiveDate = 'January 1, 2025';

  return (
    <main className="page-content">
      <div style={{ paddingTop: 'var(--space-2xl)', paddingBottom: 'var(--space-2xl)', width: '100%', maxWidth: 720, margin: '0 auto' }}>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 400, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)', lineHeight: 1.2 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-2xl)' }}>
          {company_name} &mdash; Effective {effectiveDate}
        </p>

        <Section title="Who We Are">
          <p>
            {company_name} (&ldquo;{brand_name}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is a pool design and installation company serving {location}. This Privacy Policy explains how we collect, use, and protect your personal information when you use our online pool estimate tool or contact us directly.
          </p>
        </Section>

        <Section title="Information We Collect">
          <p>When you use our estimate tool, we may collect the following:</p>
          <ul>
            <li><strong>Contact information</strong> — your name, email address, and phone number, provided when you submit your estimate request.</li>
            <li><strong>Property information</strong> — your address or location, used to assess service area eligibility and tailor your estimate.</li>
            <li><strong>Project preferences</strong> — pool model, features, decking selections, and timeline, used to generate your estimate.</li>
            <li><strong>Usage data</strong> — pages visited, time spent, and interactions with our tool, collected automatically via cookies and analytics services.</li>
          </ul>
        </Section>

        <Section title="How We Use Your Information">
          <p>We use your information to:</p>
          <ul>
            <li>Generate and deliver your personalised pool estimate.</li>
            <li>Contact you to schedule a free design consultation, if requested.</li>
            <li>Respond to enquiries and provide customer support.</li>
            <li>Improve our estimate tool and website experience.</li>
            <li>Send relevant follow-up communications related to your project inquiry. You may opt out at any time.</li>
          </ul>
          <p>We will not use your information for unrelated marketing without your consent.</p>
        </Section>

        <Section title="Information Sharing">
          <p>
            We do not sell your personal information to third parties. We may share your information with:
          </p>
          <ul>
            <li><strong>Service providers</strong> — trusted tools we use to operate our business (CRM, scheduling, email delivery), who are bound by confidentiality obligations.</li>
            <li><strong>Analytics providers</strong> — such as Google Analytics, which may collect anonymised usage data to help us understand how our tool is used.</li>
            <li><strong>Legal requirements</strong> — if required by law or to protect the rights and safety of our company or others.</li>
          </ul>
        </Section>

        <Section title="Cookies and Tracking">
          <p>
            Our website uses cookies and similar technologies to remember your preferences and analyse traffic. You can disable cookies in your browser settings, though some features of the tool may not function as intended.
          </p>
          <p>
            We may use Google Analytics and Meta Pixel to measure the effectiveness of our advertising. These services may collect anonymised data about your visit. You can opt out of Google Analytics tracking via the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Add-on</a>.
          </p>
        </Section>

        <Section title="Data Retention">
          <p>
            We retain your personal information for as long as necessary to fulfil the purposes outlined in this policy, or as required by law. If you would like your data deleted, please contact us and we will action your request promptly.
          </p>
        </Section>

        <Section title="Your Rights">
          <p>You have the right to:</p>
          <ul>
            <li>Request access to the personal information we hold about you.</li>
            <li>Request correction of inaccurate or incomplete data.</li>
            <li>Request deletion of your personal data.</li>
            <li>Opt out of marketing communications at any time.</li>
          </ul>
          <p>To exercise any of these rights, please contact us using the details below.</p>
        </Section>

        <Section title="Data Security">
          <p>
            We take reasonable technical and organisational measures to protect your information from unauthorised access, loss, or misuse. Our estimate tool is served over HTTPS and we limit access to personal data to authorised personnel only.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will revise the effective date at the top of this page. We encourage you to review this policy periodically.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>If you have any questions about this Privacy Policy or how we handle your data, please contact us:</p>
          <div style={{ marginTop: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            <strong>{company_name}</strong>
            {contact_phone && (
              <a href={`tel:${contact_phone}`} style={{ color: 'var(--brand-primary)' }}>{contact_phone}</a>
            )}
            {contact_email && (
              <a href={`mailto:${contact_email}`} style={{ color: 'var(--brand-primary)' }}>{contact_email}</a>
            )}
          </div>
        </Section>

      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-2xl)' }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--text-xl)',
        fontWeight: 400,
        color: 'var(--text-primary)',
        marginBottom: 'var(--space-md)',
        paddingBottom: 'var(--space-sm)',
        borderBottom: '1px solid var(--canvas-border)',
      }}>
        {title}
      </h2>
      <div style={{
        fontSize: 'var(--text-base)',
        color: 'var(--text-secondary)',
        lineHeight: 1.8,
        fontWeight: 300,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
      }}>
        {children}
      </div>
    </section>
  );
}
