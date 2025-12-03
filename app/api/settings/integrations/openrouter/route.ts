import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { OpenAI } from 'openai';

export const dynamic = 'force-dynamic';

function maskKey(key?: string | null) {
  if (!key) return null;
  return key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '••••••';
}

export async function GET(request: NextRequest) {
  try {
    const enabled = await db.getSetting('openrouter_enabled');
    const key = await db.getSetting('openrouter_api_key');
    const payload = {
      enabled: enabled === 'true' || enabled === true,
      key: maskKey(typeof key === 'string' ? key : null),
    };
    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error fetching openrouter integration:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch integration' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled, key } = body;

    // Authorization: require admin key in production to update sensitive settings
    if (process.env.NODE_ENV !== 'development') {
      const authHeader = request.headers.get('authorization');
      const envAdminKey = process.env.ADMIN_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!authHeader) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (!envAdminKey || provided !== envAdminKey) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (typeof enabled !== 'undefined') {
      await db.updateSetting('openrouter_enabled', String(enabled));
    }
    if (typeof key !== 'undefined') {
      if (key === null) {
        await db.updateSetting('openrouter_api_key', null);
      } else {
        await db.updateSetting('openrouter_api_key', String(key));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating openrouter integration:', error);
    return NextResponse.json({ success: false, error: 'Failed to update integration' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keyFromBody = body?.key;

    // Choose key from request body or DB
    const dbKey = await db.getSetting('openrouter_api_key');
    const apiKey = keyFromBody || (typeof dbKey === 'string' ? dbKey : null);
    if (!apiKey) return NextResponse.json({ success: false, error: 'No API key found' }, { status: 400 });

    // Create a temporary OpenAI client configured for the OpenRouter host
    const client = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' } as any);

    // Try to list models to verify the key
    const resp = await client.models.list();
    if (!resp || !resp.data) {
      return NextResponse.json({ success: false, error: 'Invalid response from OpenRouter' }, { status: 502 });
    }
    return NextResponse.json({ success: true, data: { models: resp.data.length } });
  } catch (error: any) {
    console.error('Error testing openrouter key:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to test key' }, { status: 500 });
  }
}
