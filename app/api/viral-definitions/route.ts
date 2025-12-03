import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    
    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const definition = await db.getViralDefinition(accountId);
    
    return NextResponse.json({
      success: true,
      data: definition,
    });
  } catch (error) {
    console.error('Error fetching viral definition:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch viral definition' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.account_id) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Validate weights sum to 100
    const weights = [
      body.likes_weight || 0,
      body.shares_weight || 0,
      body.comments_weight || 0,
      body.views_weight || 0,
      body.saves_weight || 0,
      body.ctr_weight || 0,
    ];
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight !== 100) {
      return NextResponse.json(
        { success: false, error: 'Weights must sum to 100' },
        { status: 400 }
      );
    }

    const definition = await db.upsertViralDefinition(body);
    
    return NextResponse.json({
      success: true,
      data: definition,
    });
  } catch (error) {
    console.error('Error saving viral definition:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save viral definition' },
      { status: 500 }
    );
  }
}
