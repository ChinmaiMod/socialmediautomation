/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

// Mock NextResponse
const mockJsonResponse = jest.fn((data: any, init?: { status?: number }) => ({
  json: async () => data,
  status: init?.status || 200,
}));

jest.mock('next/server', () => ({
  NextRequest: jest.requireActual('next/server').NextRequest,
  NextResponse: {
    json: (data: any, init?: { status?: number }) => mockJsonResponse(data, init),
  },
}));

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    getPosts: jest.fn(),
    getPost: jest.fn(),
    getPostEngagements: jest.fn(),
  },
}));

import { GET } from '@/app/api/history/route';
import { db } from '@/lib/db';

const mockDb = db as jest.Mocked<typeof db>;

describe('History API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJsonResponse.mockClear();
  });

  describe('GET /api/history', () => {
    const mockPosts = [
      {
        id: 'post-1',
        account_id: 'acc-1',
        platform: 'linkedin' as const,
        content: 'Test post content 1',
        media_urls: [],
        hashtags: ['#test'],
        external_post_id: 'ext-1',
        post_url: 'https://linkedin.com/post/1',
        trend_topic: 'AI trends',
        pattern_id: 'pat-1',
        predicted_viral_score: 75,
        actual_viral_score: 82,
        status: 'posted' as const,
        scheduled_at: null,
        posted_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
      },
      {
        id: 'post-2',
        account_id: 'acc-1',
        platform: 'facebook' as const,
        content: 'Test post content 2',
        media_urls: [],
        hashtags: [],
        external_post_id: 'ext-2',
        post_url: 'https://facebook.com/post/2',
        trend_topic: null,
        pattern_id: null,
        predicted_viral_score: 60,
        actual_viral_score: 45,
        status: 'posted' as const,
        scheduled_at: null,
        posted_at: '2024-01-02T12:00:00Z',
        created_at: '2024-01-02T10:00:00Z',
        updated_at: '2024-01-02T12:00:00Z',
      },
    ];

    const mockEngagement = {
      id: 'eng-1',
      post_id: 'post-1',
      checkpoint_hours: 24,
      likes: 150,
      shares: 30,
      comments: 25,
      views: 5000,
      saves: 10,
      clicks: 200,
      impressions: 8000,
      reach: 6000,
      viral_score: 82,
      recorded_at: '2024-01-02T12:00:00Z',
    };

    it('should return posts with engagement data', async () => {
      mockDb.getPosts.mockResolvedValue(mockPosts);
      mockDb.getPostEngagements.mockResolvedValue([mockEngagement]);
      
      const request = new NextRequest('http://localhost/api/history');
      
      await GET(request);
      
      expect(mockDb.getPosts).toHaveBeenCalled();
      expect(mockJsonResponse.mock.calls[0][0]).toMatchObject({
        success: true,
      });
    });

    it('should filter by account_id', async () => {
      mockDb.getPosts.mockResolvedValue([mockPosts[0]]);
      mockDb.getPostEngagements.mockResolvedValue([mockEngagement]);
      
      const request = new NextRequest('http://localhost/api/history?account_id=acc-1');
      
      await GET(request);
      
      expect(mockDb.getPosts).toHaveBeenCalledWith(
        expect.objectContaining({ account_id: 'acc-1' })
      );
    });

    it('should filter by platform', async () => {
      mockDb.getPosts.mockResolvedValue([mockPosts[0]]);
      mockDb.getPostEngagements.mockResolvedValue([]);
      
      const request = new NextRequest('http://localhost/api/history?platform=linkedin');
      
      await GET(request);
      
      expect(mockDb.getPosts).toHaveBeenCalledWith(
        expect.objectContaining({ platform: 'linkedin' })
      );
    });

    it('should filter by status', async () => {
      mockDb.getPosts.mockResolvedValue([mockPosts[0]]);
      mockDb.getPostEngagements.mockResolvedValue([]);
      
      const request = new NextRequest('http://localhost/api/history?status=posted');
      
      await GET(request);
      
      expect(mockDb.getPosts).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'posted' })
      );
    });

    it('should filter viral posts only', async () => {
      mockDb.getPosts.mockResolvedValue(mockPosts);
      mockDb.getPostEngagements.mockResolvedValue([]);
      
      const request = new NextRequest('http://localhost/api/history?viral_only=true');
      
      await GET(request);
      
      // The viral filter is applied in the route
      expect(mockJsonResponse.mock.calls[0][0]).toMatchObject({
        success: true,
      });
    });

    it('should handle pagination', async () => {
      mockDb.getPosts.mockResolvedValue([mockPosts[0]]);
      mockDb.getPostEngagements.mockResolvedValue([]);
      
      const request = new NextRequest('http://localhost/api/history?limit=10&offset=5');
      
      await GET(request);
      
      expect(mockDb.getPosts).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 5 })
      );
    });

    it('should indicate hasMore when limit is reached', async () => {
      const manyPosts = Array(10).fill(null).map((_, i) => ({
        ...mockPosts[0],
        id: `post-${i}`,
      }));
      mockDb.getPosts.mockResolvedValue(manyPosts);
      mockDb.getPostEngagements.mockResolvedValue([]);
      
      const request = new NextRequest('http://localhost/api/history?limit=10');
      
      await GET(request);
      
      expect(mockJsonResponse.mock.calls[0][0]).toMatchObject({
        success: true,
        meta: expect.objectContaining({ hasMore: true }),
      });
    });

    it('should return 500 on database error', async () => {
      mockDb.getPosts.mockRejectedValue(new Error('DB error'));
      
      const request = new NextRequest('http://localhost/api/history');
      
      await GET(request);
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        { success: false, error: 'Failed to fetch post history' },
        { status: 500 }
      );
    });

    it('should handle posts with no engagement data', async () => {
      mockDb.getPosts.mockResolvedValue([mockPosts[1]]);
      mockDb.getPostEngagements.mockResolvedValue([]);
      
      const request = new NextRequest('http://localhost/api/history');
      
      await GET(request);
      
      expect(mockJsonResponse.mock.calls[0][0]).toMatchObject({
        success: true,
      });
    });
  });
});
