import { NextRequest, NextResponse } from 'next/server';
import { db, Platform } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') as Platform | null;
    const nicheId = searchParams.get('niche_id');
    const search = searchParams.get('search');
    
    const filters: { platform?: Platform; niche_id?: string } = {};
    if (platform) filters.platform = platform;
    if (nicheId) filters.niche_id = nicheId;

    let patterns = await db.getViralPatterns(filters);
    
    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      patterns = patterns.filter(p => 
        p.hook_example.toLowerCase().includes(searchLower) ||
        (p.content_structure?.toLowerCase().includes(searchLower)) ||
        (p.emotional_trigger?.toLowerCase().includes(searchLower))
      );
    }
    
    return NextResponse.json({
      success: true,
      data: patterns,
    });
  } catch (error) {
    console.error('Error fetching viral patterns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch viral patterns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.hook_example) {
      return NextResponse.json(
        { success: false, error: 'Hook example is required' },
        { status: 400 }
      );
    }

    if (!body.platforms || body.platforms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one platform is required' },
        { status: 400 }
      );
    }

    const pattern = await db.createViralPattern({
      ...body,
      is_custom: true,
      usage_count: 0,
      success_rate: body.success_rate || 0,
    });
    
    return NextResponse.json({
      success: true,
      data: pattern,
    });
  } catch (error) {
    console.error('Error creating viral pattern:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create viral pattern' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patternId = searchParams.get('id');
    
    if (!patternId) {
      return NextResponse.json(
        { success: false, error: 'Pattern ID is required' },
        { status: 400 }
      );
    }

    // Increment usage count
    await db.incrementPatternUsage(patternId);
    
    return NextResponse.json({
      success: true,
      message: 'Pattern usage incremented',
    });
  } catch (error) {
    console.error('Error updating pattern usage:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update pattern usage' },
      { status: 500 }
    );
  }
}
