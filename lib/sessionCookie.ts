import type { Session } from '@supabase/supabase-js';

const SESSION_ENDPOINT = '/api/auth/session';

export async function syncSessionCookie(session: Session | null) {
  if (typeof fetch === 'undefined') {
    return;
  }

  try {
    if (session) {
      await fetch(SESSION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
        }),
      });
    } else {
      await fetch(SESSION_ENDPOINT, { method: 'DELETE' });
    }
  } catch (error) {
    console.error('Failed to sync auth session', error);
  }
}
