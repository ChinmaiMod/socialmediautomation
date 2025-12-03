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
    getViralDefinition: jest.fn(),
    upsertViralDefinition: jest.fn(),
  },
}));

import { GET, POST } from '@/app/api/viral-definitions/route';
import { db } from '@/lib/db';

const mockDb = db as jest.Mocked<typeof db>;

describe('Viral Definitions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJsonResponse.mockClear();
  });

  describe('GET /api/viral-definitions', () => {
    it('should return 400 when account_id is missing', async () => {
      const request = new NextRequest('http://localhost/api/viral-definitions');
      
      await GET(request);
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    });

    it('should return viral definition for valid account_id', async () => {
      const mockDefinition = {
        id: 'def-1',
        account_id: 'acc-1',
        likes_weight: 20,
        likes_threshold: 100,
        shares_weight: 30,
        shares_threshold: 50,
        comments_weight: 20,
        comments_threshold: 30,
        views_weight: 10,
        views_threshold: 1000,
        saves_weight: 10,
        saves_threshold: 20,
        ctr_weight: 10,
        ctr_threshold: 5,
        minimum_viral_score: 70,
        timeframe_hours: 48,
        comparison_method: 'vs_account_average',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      
      mockDb.getViralDefinition.mockResolvedValue(mockDefinition);
      
      const request = new NextRequest('http://localhost/api/viral-definitions?account_id=acc-1');
      
      await GET(request);
      
      expect(mockDb.getViralDefinition).toHaveBeenCalledWith('acc-1');
      expect(mockJsonResponse.mock.calls[0][0]).toMatchObject({
        success: true,
        data: mockDefinition,
      });
    });

    it('should return null when no definition exists', async () => {
      mockDb.getViralDefinition.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost/api/viral-definitions?account_id=acc-nonexistent');
      
      await GET(request);
      
      expect(mockJsonResponse.mock.calls[0][0]).toMatchObject({
        success: true,
        data: null,
      });
    });

    it('should return 500 on database error', async () => {
      mockDb.getViralDefinition.mockRejectedValue(new Error('DB error'));
      
      const request = new NextRequest('http://localhost/api/viral-definitions?account_id=acc-1');
      
      await GET(request);
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        { success: false, error: 'Failed to fetch viral definition' },
        { status: 500 }
      );
    });
  });

  describe('POST /api/viral-definitions', () => {
    it('should return 400 when account_id is missing', async () => {
      const request = new NextRequest('http://localhost/api/viral-definitions', {
        method: 'POST',
        body: JSON.stringify({ likes_weight: 100 }),
      });
      
      await POST(request);
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    });

    it('should return 400 when weights do not sum to 100', async () => {
      const request = new NextRequest('http://localhost/api/viral-definitions', {
        method: 'POST',
        body: JSON.stringify({
          account_id: 'acc-1',
          likes_weight: 20,
          shares_weight: 20,
          comments_weight: 20,
          views_weight: 10,
          saves_weight: 10,
          ctr_weight: 10, // Sums to 90, not 100
        }),
      });
      
      await POST(request);
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        { success: false, error: 'Weights must sum to 100' },
        { status: 400 }
      );
    });

    it('should create viral definition with valid weights', async () => {
      const validDefinition = {
        account_id: 'acc-1',
        likes_weight: 20,
        shares_weight: 30,
        comments_weight: 20,
        views_weight: 10,
        saves_weight: 10,
        ctr_weight: 10,
        likes_threshold: 100,
        minimum_viral_score: 70,
        timeframe_hours: 48,
        comparison_method: 'vs_account_average',
      };
      
      const mockResult = { id: 'def-1', ...validDefinition, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' };
      mockDb.upsertViralDefinition.mockResolvedValue(mockResult as any);
      
      const request = new NextRequest('http://localhost/api/viral-definitions', {
        method: 'POST',
        body: JSON.stringify(validDefinition),
      });
      
      await POST(request);
      
      expect(mockDb.upsertViralDefinition).toHaveBeenCalledWith(validDefinition);
      expect(mockJsonResponse.mock.calls[0][0]).toMatchObject({
        success: true,
      });
    });

    it('should return 500 on database error', async () => {
      const validDefinition = {
        account_id: 'acc-1',
        likes_weight: 20,
        shares_weight: 30,
        comments_weight: 20,
        views_weight: 10,
        saves_weight: 10,
        ctr_weight: 10,
      };
      
      mockDb.upsertViralDefinition.mockRejectedValue(new Error('DB error'));
      
      const request = new NextRequest('http://localhost/api/viral-definitions', {
        method: 'POST',
        body: JSON.stringify(validDefinition),
      });
      
      await POST(request);
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        { success: false, error: 'Failed to save viral definition' },
        { status: 500 }
      );
    });
  });
});
