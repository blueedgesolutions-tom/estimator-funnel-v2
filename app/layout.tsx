import type { Metadata } from 'next';
import { getTenant, getTenantId } from '@/lib/tenant';
import { resolveTheme, buildBrandStyles } from '@/lib/theme';
import FunnelProvider from '@/components/FunnelProvider';
import ConditionalHeader from '@/components/ConditionalHeader';
import ConditionalFooter from '@/components/ConditionalFooter';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  return {
    title: `${tenant.config.brand_name} — Pool Estimate`,
    description: `Get a personalised pool estimate from ${tenant.config.company_name} in under 3 minutes.`,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tenant, tenantId] = await Promise.all([getTenant(), getTenantId()]);
  const theme = resolveTheme(tenant.config.theme);
  const brandStyles = buildBrandStyles(theme);

  // Optional: per-tenant logo-height CSS var
  const logoHeightStyle = tenant.config.logo_height
    ? `--logo-height:${tenant.config.logo_height}px;`
    : '';

  return (
    <html lang="en">
      <head>
        {/* Brand tokens — injected before first paint, zero FOUC */}
        <style dangerouslySetInnerHTML={{ __html: `:root{${logoHeightStyle}}${brandStyles}` }} />

        {/* Google Tag Manager / GA4 */}
        {tenant.config.gtag_id && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${tenant.config.gtag_id}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${tenant.config.gtag_id}');`,
              }}
            />
          </>
        )}

        {/* Facebook Pixel */}
        {tenant.config.fb_pixel_id && (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${tenant.config.fb_pixel_id}');fbq('track','PageView');`,
            }}
          />
        )}
      </head>
      <body>
        <div className="page-wrapper">
          <ConditionalHeader
            logoUrl={tenant.config.logo_url}
            logoHeight={tenant.config.logo_height}
            brandName={tenant.config.brand_name}
            phone={tenant.config.contact_phone}
          />
          <FunnelProvider
            tenantId={tenantId}
            brandName={tenant.config.brand_name}
            companyName={tenant.config.company_name}
            privacyPolicyUrl={tenant.config.privacy_policy_url}
            bookingEnabled={tenant.estimate.bookingEnabled && !!tenant.config.ghl_booking_webhook_url}
          >
            {children}
          </FunnelProvider>
          <ConditionalFooter
            logoUrl={tenant.config.logo_url}
            companyName={tenant.config.company_name}
            privacyPolicyUrl={tenant.config.privacy_policy_url}
            stateLicense={tenant.config.state_license}
          />
        </div>
      </body>
    </html>
  );
}
