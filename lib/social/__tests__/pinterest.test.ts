import axios from 'axios';
import {
  getPinterestProfile,
  getPinterestBoards,
  postToPinterest,
  getPinterestAccessToken,
  refreshPinterestToken,
  PinterestProfile,
  PinterestBoard,
  PinterestPostParams,
  PinterestPostResponse,
} from '../pinterest';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Pinterest Social Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PINTEREST_APP_ID = 'test-app-id';
    process.env.PINTEREST_APP_SECRET = 'test-app-secret';
  });

  describe('getPinterestProfile', () => {
    it('should fetch Pinterest profile successfully', async () => {
      const mockProfile = {
        id: 'pin-123',
        username: 'testuser',
        profile_image: 'https://example.com/avatar.jpg',
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockProfile });

      const result = await getPinterestProfile('test-access-token');

      expect(result).toEqual({
        id: 'pin-123',
        username: 'testuser',
        profile_image: 'https://example.com/avatar.jpg',
      });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.pinterest.com/v5/user_account',
        {
          headers: {
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should throw error on profile fetch failure', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: { message: 'Invalid access token' },
        },
      });

      await expect(getPinterestProfile('invalid-token')).rejects.toThrow(
        'Pinterest profile fetch failed: Invalid access token'
      );
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(getPinterestProfile('token')).rejects.toThrow(
        'Pinterest profile fetch failed: Network timeout'
      );
    });
  });

  describe('getPinterestBoards', () => {
    it('should fetch Pinterest boards successfully', async () => {
      const mockBoards = {
        items: [
          { id: 'board-1', name: 'Board One', description: 'First board', privacy: 'PUBLIC' },
          { id: 'board-2', name: 'Board Two', description: 'Second board', privacy: 'PROTECTED' },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockBoards });

      const result = await getPinterestBoards('test-access-token');

      expect(result).toEqual([
        { id: 'board-1', name: 'Board One', description: 'First board', privacy: 'PUBLIC' },
        { id: 'board-2', name: 'Board Two', description: 'Second board', privacy: 'PROTECTED' },
      ]);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.pinterest.com/v5/boards',
        {
          headers: {
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json',
          },
          params: {
            page_size: 100,
          },
        }
      );
    });

    it('should return empty array when no boards exist', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { items: [] } });

      const result = await getPinterestBoards('test-token');

      expect(result).toEqual([]);
    });

    it('should throw error on boards fetch failure', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: { message: 'Unauthorized' },
        },
      });

      await expect(getPinterestBoards('invalid-token')).rejects.toThrow(
        'Pinterest boards fetch failed: Unauthorized'
      );
    });
  });

  describe('postToPinterest', () => {
    it('should create pin successfully with image URL', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'pin-post-123' },
      });

      const params: PinterestPostParams = {
        access_token: 'test-token',
        board_id: 'board-123',
        title: 'Test Pin',
        description: 'Test description',
        media_source: {
          source_type: 'image_url',
          url: 'https://example.com/image.jpg',
        },
      };

      const result = await postToPinterest(params);

      expect(result).toEqual({
        id: 'pin-post-123',
        success: true,
      });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.pinterest.com/v5/pins',
        {
          board_id: 'board-123',
          title: 'Test Pin',
          description: 'Test description',
          media_source: {
            source_type: 'image_url',
            url: 'https://example.com/image.jpg',
          },
        },
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should create pin with link', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'pin-post-456' },
      });

      const params: PinterestPostParams = {
        access_token: 'test-token',
        board_id: 'board-123',
        title: 'Pin with Link',
        description: 'Check out this link',
        link: 'https://mysite.com/article',
        media_source: {
          source_type: 'image_url',
          url: 'https://example.com/image.jpg',
        },
      };

      const result = await postToPinterest(params);

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.pinterest.com/v5/pins',
        expect.objectContaining({
          link: 'https://mysite.com/article',
        }),
        expect.any(Object)
      );
    });

    it('should return error response on post failure', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { message: 'Invalid board ID' },
        },
      });

      const params: PinterestPostParams = {
        access_token: 'test-token',
        board_id: 'invalid-board',
        title: 'Test Pin',
        description: 'Test',
        media_source: {
          source_type: 'image_url',
          url: 'https://example.com/image.jpg',
        },
      };

      const result = await postToPinterest(params);

      expect(result).toEqual({
        id: '',
        success: false,
        error: 'Invalid board ID',
      });
    });

    it('should handle base64 image source', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'pin-post-789' },
      });

      const params: PinterestPostParams = {
        access_token: 'test-token',
        board_id: 'board-123',
        title: 'Base64 Pin',
        description: 'Uploaded from base64',
        media_source: {
          source_type: 'image_base64',
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAUA...',
        },
      };

      const result = await postToPinterest(params);

      expect(result.success).toBe(true);
    });
  });

  describe('getPinterestAccessToken', () => {
    it('should exchange authorization code for access token', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
          token_type: 'bearer',
          expires_in: 31536000,
        },
      });

      const result = await getPinterestAccessToken('auth-code', 'https://example.com/callback');

      expect(result).toEqual({
        access_token: 'new-access-token',
        token_type: 'bearer',
        expires_in: 31536000,
      });

      // Verify Basic auth header is created correctly
      const expectedAuth = Buffer.from('test-app-id:test-app-secret').toString('base64');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.pinterest.com/v5/oauth/token',
        expect.any(URLSearchParams),
        {
          headers: {
            'Authorization': `Basic ${expectedAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    });

    it('should throw error on token exchange failure', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { message: 'Invalid authorization code' },
        },
      });

      await expect(
        getPinterestAccessToken('invalid-code', 'https://example.com/callback')
      ).rejects.toThrow('Pinterest token exchange failed: Invalid authorization code');
    });
  });

  describe('refreshPinterestToken', () => {
    it('should refresh access token successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'refreshed-token',
          expires_in: 31536000,
        },
      });

      const result = await refreshPinterestToken('refresh-token-123');

      expect(result).toEqual({
        access_token: 'refreshed-token',
        expires_in: 31536000,
      });

      const expectedAuth = Buffer.from('test-app-id:test-app-secret').toString('base64');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.pinterest.com/v5/oauth/token',
        expect.any(URLSearchParams),
        {
          headers: {
            'Authorization': `Basic ${expectedAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    });

    it('should throw error on refresh failure', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { message: 'Refresh token expired' },
        },
      });

      await expect(refreshPinterestToken('expired-token')).rejects.toThrow(
        'Pinterest token refresh failed: Refresh token expired'
      );
    });
  });

  describe('Type Exports', () => {
    it('should export PinterestProfile interface correctly', () => {
      const profile: PinterestProfile = {
        id: 'pin-123',
        username: 'testuser',
        profile_image: 'https://example.com/avatar.jpg',
      };
      expect(profile.username).toBe('testuser');
    });

    it('should export PinterestBoard interface correctly', () => {
      const board: PinterestBoard = {
        id: 'board-1',
        name: 'Test Board',
        description: 'A test board',
        privacy: 'PUBLIC',
      };
      expect(board.privacy).toBe('PUBLIC');
    });

    it('should export PinterestPostParams interface correctly', () => {
      const params: PinterestPostParams = {
        access_token: 'token',
        board_id: 'board-1',
        title: 'Test',
        description: 'Test desc',
        media_source: {
          source_type: 'image_url',
          url: 'https://example.com/image.jpg',
        },
      };
      expect(params.media_source.source_type).toBe('image_url');
    });

    it('should export PinterestPostResponse interface correctly', () => {
      const response: PinterestPostResponse = {
        id: 'pin-1',
        success: true,
      };
      expect(response.success).toBe(true);
    });
  });
});
