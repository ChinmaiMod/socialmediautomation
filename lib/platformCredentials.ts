import { supabaseAdmin } from '@/lib/db';

interface PlatformCredentials {
  clientId: string | null;
  clientSecret: string | null;
}

export async function getPlatformCredentials(platform: 'linkedin' | 'facebook' | 'pinterest' | 'twitter'): Promise<PlatformCredentials> {
  const idKey = platform === 'facebook' ? `${platform}_app_id` : `${platform}_client_id`;
  const secretKey = platform === 'facebook' ? `${platform}_app_secret` : `${platform}_client_secret`;

  try {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('key, value')
      .in('key', [idKey, secretKey]);

    if (error) {
      console.error(`Error fetching ${platform} credentials:`, error);
      return { clientId: null, clientSecret: null };
    }

    const credentials: Record<string, string | null> = {};
    for (const row of data || []) {
      credentials[row.key] = row.value as string | null;
    }

    return {
      clientId: credentials[idKey] || null,
      clientSecret: credentials[secretKey] || null,
    };
  } catch (err) {
    console.error(`Error fetching ${platform} credentials:`, err);
    return { clientId: null, clientSecret: null };
  }
}

// Helper to get credentials with env var fallback
export async function getLinkedInCredentials(): Promise<PlatformCredentials> {
  const dbCreds = await getPlatformCredentials('linkedin');
  return {
    clientId: dbCreds.clientId || process.env.LINKEDIN_CLIENT_ID || null,
    clientSecret: dbCreds.clientSecret || process.env.LINKEDIN_CLIENT_SECRET || null,
  };
}

export async function getFacebookCredentials(): Promise<PlatformCredentials> {
  const dbCreds = await getPlatformCredentials('facebook');
  return {
    clientId: dbCreds.clientId || process.env.FACEBOOK_APP_ID || null,
    clientSecret: dbCreds.clientSecret || process.env.FACEBOOK_APP_SECRET || null,
  };
}

export async function getPinterestCredentials(): Promise<PlatformCredentials> {
  const dbCreds = await getPlatformCredentials('pinterest');
  return {
    clientId: dbCreds.clientId || process.env.PINTEREST_APP_ID || null,
    clientSecret: dbCreds.clientSecret || process.env.PINTEREST_APP_SECRET || null,
  };
}

export async function getTwitterCredentials(): Promise<PlatformCredentials> {
  const dbCreds = await getPlatformCredentials('twitter');
  return {
    clientId: dbCreds.clientId || process.env.TWITTER_CLIENT_ID || null,
    clientSecret: dbCreds.clientSecret || process.env.TWITTER_CLIENT_SECRET || null,
  };
}
