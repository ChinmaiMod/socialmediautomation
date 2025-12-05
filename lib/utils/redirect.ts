export function getEmailRedirectUrl(win?: any): string | undefined {
  // If running in a browser, prefer using window.location, which picks up the hostname
  // from the current deployment or preview. Allow passing a custom 'win' for testing.
  const w = win ?? (typeof window !== 'undefined' ? window : undefined);
  if (w && w.location) {
    const origin = w.location.origin.replace(/\/$/, '');
    return `${origin}/login`;
  }

  // In server contexts, fallback to environment variables
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    const normalized = siteUrl.replace(/\/$/, '');
    return `${normalized}/login`;
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) {
    const normalized = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
    return `${normalized.replace(/\/$/, '')}/login`;
  }

  return undefined;
}
