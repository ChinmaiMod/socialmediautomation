import { getEmailRedirectUrl } from '../redirect';

describe('getEmailRedirectUrl util', () => {
  it('returns window.location.origin/login when window is present', () => {
    const originalWindow = (global as any).window;
    const url = getEmailRedirectUrl({ location: { origin: 'https://prod.example.com' } });
    expect(url).toBe('https://prod.example.com/login');

    (global as any).window = originalWindow;
  });

  it('returns NEXT_PUBLIC_SITE_URL/login when no window is present', () => {
    const originalWindow = (global as any).window;
    delete (global as any).window;
    const oldSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = 'https://env.example.com';

    const url = getEmailRedirectUrl();
    expect(url).toBe('https://env.example.com/login');

    process.env.NEXT_PUBLIC_SITE_URL = oldSiteUrl;
    (global as any).window = originalWindow;
  });

  it('returns https://NEXT_PUBLIC_VERCEL_URL/login when provided and no window or site url', () => {
    const originalWindow = (global as any).window;
    delete (global as any).window;

    const oldSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const oldVercel = process.env.NEXT_PUBLIC_VERCEL_URL;

    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_VERCEL_URL = 'my-deploy.vercel.app';

    const url = getEmailRedirectUrl();
    expect(url).toBe('https://my-deploy.vercel.app/login');

    process.env.NEXT_PUBLIC_VERCEL_URL = oldVercel;
    process.env.NEXT_PUBLIC_SITE_URL = oldSiteUrl;
    (global as any).window = originalWindow;
  });
});
