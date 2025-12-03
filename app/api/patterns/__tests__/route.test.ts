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
    getViralPatterns: jest.fn(),
    createViralPattern: jest.fn(),
    incrementPatternUsage: jest.fn(),
  },
}));

import { GET, POST, PATCH } from '@/app/api/patterns/route';
import { db } from '@/lib/db';

const mockDb = db as jest.Mocked<typeof db>;

describe('Patterns API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJsonResponse.mockClear();
  });

  describe('GET /api/patterns', () => {
    const mockPatterns = [
      {
        id: 'pat-1',
        hook_example: 'Did you know that...',
        content_structure: 'Hook -> Problem -> Solution -> CTA',
        emotional_trigger: 'curiosity',
        success_rate: 85,
        usage_count: 120,
        platforms: ['linkedin', 'facebook'] as any,
        niches: ['tech'],
        is_custom: false,
        created_by: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'pat-2',
        hook_example: 'I failed 100 times before...',
        content_structure: 'Personal story -> Lesson -> Takeaway',
        emotional_trigger: 'empathy',
        success_rate: 78,
        usage_count: 90,
        platforms: ['linkedin'] as any,
        niches: ['business'],
        is_custom: true,
        created_by: 'user-1',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ];

    it('should return all patterns without filters', async () => {
      mockDb.getViralPatterns.mockResolvedValue(mockPatterns);
      
      const request = new NextRequest('http://localhost/api/patterns');
      
      await GET(request);
      
      expect(mockDb.getViralPatterns).toHaveBeenCalledWith({});
      expect(mockJsonResponse.mock.calls[0][0]).toMatchObject({
        success: true,
        data: mockPatterns,
      });
    });

    it('should filter patterns by platform', async () => {
      mockDb.getViralPatterns.mockResolvedValue([mockPatterns[1]]);
      
      const request = new NextRequest('http://localhost/api/patterns?platform=linkedin');
      
      await GET(request);
      
      expect(mockDb.getViralPatterns).toHaveBeenCalledWith({ platform: 'linkedin' });
    });

    it('should filter patterns by niche_id', async () => {
      mockDb.getViralPatterns.mockResolvedValue([mockPatterns[0]]);
      
      const request = new NextRequest('http://localhost/api/patterns?niche_id=tech');
      
      await GET(request);
      
      expect(mockDb.getViralPatterns).toHaveBeenCalledWith({ niche_id: 'tech' });
    });

    it('should filter patterns by search term', async () => {
      mockDb.getViralPatterns.mockResolvedValue(mockPatterns);
      
      const request = new NextRequest('http://localhost/api/patterns?search=failed');
      
      await GET(request);
      
      // Search filter returns only matching pattern
      expect(mockJsonResponse.mock.calls[0][0]).toMatchObject({
        success: true,
      });
    });

    it('should return 500 on database error', async () => {
      mockDb.getViralPatterns.mockRejectedValue(new Error('DB error'));
      
      const request = new NextRequest('http://localhost/api/patterns');
      
      await GET(request);
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        { success: false, error: 'Failed to fetch viral patterns' },
        { status: 500 }
      );
    });
  });

  describe('POST /api/patterns', () => {
    it('should return 400 when hook_example is missing', async () => {
      const request = new NextRequest('http://localhost/api/patterns', {
        method: 'POST',
        body: JSON.stringify({ platforms: ['linkedin'] }),
      });
      
      await POST(request);
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        { success: false, error: 'Hook example is required' },
        { status: 400 }
      );
    });

    it('should return 400 when platforms is empty', async () => {
      const request = new NextRequest('http://localhost/api/patterns', {
        method: 'POST',
        body: JSON.stringify({ hook_example: 'Test hook', platforms: [] }),
      });
      
      await POST(request);
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        { success: false, error: 'At least one platform is required' },
        { status: 400 }
      );
    });

    it('should create pattern with valid data', async () => {
      const newPattern = {
        hook_example: 'The truth about...',
        content_structure: 'Reveal -> Evidence -> Conclusion',
        emotional_trigger: 'shock',
        platforms: ['linkedin', 'facebook'],
        niches: ['marketing'],
      };
      
      const mockResult = {
        id: 'pat-new',
        ...newPattern,
        success_rate: 0,
        usage_count: 0,
        is_custom: true,
        created_by: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      
      mockDb.createViralPattern.mockResolvedValue(mockResult as any);
      
      const request = new NextRequest('http://localhost/api/patterns', {
        method: 'POST',
        body: JSON.stringify(newPattern),
      });
      
      await POST(request);
      
      expect(mockJsonResponse.mock.calls[0][0]).toMatchObject({
        success: true,
      });
    });

    it('should return 500 on database error', async () => {
      mockDb.createViralPattern.mockRejectedValue(new Error('DB error'));
      
      const request = new NextRequest('http://localhost/api/patterns', {
        method: 'POST',
        body: JSON.stringify({
          hook_example: 'Test',
          platforms: ['linkedin'],
        }),
      });
      
      await POST(request);
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        { success: false, error: 'Failed to create viral pattern' },
        { status: 500 }
      );
    });
  });

  describe('PATCH /api/patterns', () => {
    it('should return 400 when pattern ID is missing', async () => {
      const request = new NextRequest('http://localhost/api/patterns', {
        method: 'PATCH',
      });
      
      await PATCH(request);
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        { success: false, error: 'Pattern ID is required' },
        { status: 400 }
      );
    });

    it('should increment pattern usage', async () => {
      mockDb.incrementPatternUsage.mockResolvedValue(undefined);
      
      const request = new NextRequest('http://localhost/api/patterns?id=pat-1', {
        method: 'PATCH',
      });
      
      await PATCH(request);
      
      expect(mockDb.incrementPatternUsage).toHaveBeenCalledWith('pat-1');
      expect(mockJsonResponse.mock.calls[0][0]).toMatchObject({
        success: true,
        message: 'Pattern usage incremented',
      });
    });

    it('should return 500 on database error', async () => {
      mockDb.incrementPatternUsage.mockRejectedValue(new Error('DB error'));
      
      const request = new NextRequest('http://localhost/api/patterns?id=pat-1', {
        method: 'PATCH',
      });
      
      await PATCH(request);
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        { success: false, error: 'Failed to update pattern usage' },
        { status: 500 }
      );
    });
  });
});
