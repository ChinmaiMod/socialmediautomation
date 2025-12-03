import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Simple guard: require Service Role Key OR allow development
    const authHeader = request.headers.get('authorization');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const envAdminKey = process.env.ADMIN_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (process.env.NODE_ENV !== 'development') {
      if (!authHeader) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (!envAdminKey || provided !== envAdminKey) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Generate a new random secret (48 bytes => 96 hex chars)
    const newSecret = randomBytes(48).toString('hex');

    // Persist to DB setting 'cron_secret'
    await db.updateSetting('cron_secret', newSecret);

    return NextResponse.json({ success: true, data: { secret: newSecret } });
  } catch (error) {
    console.error('Error regenerating cron secret:', error);
    return NextResponse.json({ success: false, error: 'Failed to regenerate cron secret' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const secret = await db.getSetting('cron_secret');
    const masked = typeof secret === 'string' && secret.length > 8 ? `${secret.slice(0, 4)}...${secret.slice(-4)}` : null;
    return NextResponse.json({ success: true, data: { secret: masked } });
  } catch (error) {
    console.error('Error reading cron secret:', error);
    return NextResponse.json({ success: false, error: 'Failed to read cron secret' }, { status: 500 });
  }
}
