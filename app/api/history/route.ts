import { NextRequest, NextResponse } from 'next/server';
import { db, Platform } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if requesting single post detail
    const postId = searchParams.get('id');
    if (postId) {
      const post = await db.getPost(postId);
      
      if (!post) {
        return NextResponse.json(
          { success: false, error: 'Post not found' },
          { status: 404 }
        );
      }
      
      const engagements = await db.getPostEngagements(postId);
      
      return NextResponse.json({
        success: true,
        data: {
          ...post,
          engagements,
        },
      });
    }
    
    // List posts with filters
    const accountId = searchParams.get('account_id');
    const platform = searchParams.get('platform') as Platform | null;
    const status = searchParams.get('status');
    const viralOnly = searchParams.get('viral_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const filters: { 
      account_id?: string; 
      platform?: Platform; 
      status?: string;
      limit?: number;
      offset?: number;
    } = { limit, offset };
    
    if (accountId) filters.account_id = accountId;
    if (platform) filters.platform = platform;
    if (status) filters.status = status;

    let posts = await db.getPosts(filters);
    
    // Apply viral filter if needed
    if (viralOnly) {
      posts = posts.filter(p => (p.actual_viral_score || 0) >= 70);
    }
    
    // Get engagement data for each post
    const postsWithEngagement = await Promise.all(
      posts.map(async (post) => {
        const engagements = await db.getPostEngagements(post.id);
        return {
          ...post,
          engagement: engagements.length > 0 ? engagements[engagements.length - 1] : null,
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: postsWithEngagement,
      meta: {
        limit,
        offset,
        hasMore: posts.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching post history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch post history' },
      { status: 500 }
    );
  }
}

// Note: For single post detail, use GET with ?id=<postId> parameter
// The main GET handler will detect the id param and return full post detail
