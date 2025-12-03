import axios from 'axios';
import {
  getFacebookProfile,
  getFacebookPages,
  postToFacebook,
  getFacebookAccessToken,
  getFacebookLongLivedToken,
  FacebookProfile,
  FacebookPage,
  FacebookPostParams,
  FacebookPostResponse,
} from '../facebook';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Facebook Social Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FACEBOOK_APP_ID = 'test-app-id';
    process.env.FACEBOOK_APP_SECRET = 'test-app-secret';
  });

  describe('getFacebookProfile', () => {
    it('should fetch Facebook profile successfully', async () => {
      const mockProfile = {
        id: '123456789',
        name: 'Test User',
        email: 'test@example.com',
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockProfile });

      const result = await getFacebookProfile('test-access-token');

      expect(result).toEqual({
        id: '123456789',
        name: 'Test User',
        email: 'test@example.com',
      });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/me',
        {
          params: {
            fields: 'id,name,email',
            access_token: 'test-access-token',
          },
        }
      );
    });

    it('should throw error on profile fetch failure', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Invalid access token' },
          },
        },
      });

      await expect(getFacebookProfile('invalid-token')).rejects.toThrow(
        'Facebook profile fetch failed: Invalid access token'
      );
    });

    it('should handle network errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(getFacebookProfile('test-token')).rejects.toThrow(
        'Facebook profile fetch failed: Network error'
      );
    });
  });

  describe('getFacebookPages', () => {
    it('should fetch Facebook pages successfully', async () => {
      const mockPages = {
        data: [
          { id: 'page1', name: 'Page One', access_token: 'token1' },
          { id: 'page2', name: 'Page Two', access_token: 'token2' },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockPages });

      const result = await getFacebookPages('test-access-token');

      expect(result).toEqual([
        { id: 'page1', name: 'Page One', access_token: 'token1' },
        { id: 'page2', name: 'Page Two', access_token: 'token2' },
      ]);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/me/accounts',
        {
          params: {
            access_token: 'test-access-token',
          },
        }
      );
    });

    it('should return empty array when no pages exist', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { data: [] } });

      const result = await getFacebookPages('test-access-token');

      expect(result).toEqual([]);
    });

    it('should throw error on pages fetch failure', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Permission denied' },
          },
        },
      });

      await expect(getFacebookPages('invalid-token')).rejects.toThrow(
        'Facebook pages fetch failed: Permission denied'
      );
    });
  });

  describe('postToFacebook', () => {
    it('should post to Facebook successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'post-123' },
      });

      const params: FacebookPostParams = {
        access_token: 'test-token',
        page_id: 'page-123',
        message: 'Test post content',
      };

      const result = await postToFacebook(params);

      expect(result).toEqual({
        id: 'post-123',
        success: true,
      });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/page-123/feed',
        null,
        {
          params: {
            message: 'Test post content',
            access_token: 'test-token',
          },
        }
      );
    });

    it('should post to Facebook with link', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'post-456' },
      });

      const params: FacebookPostParams = {
        access_token: 'test-token',
        page_id: 'page-123',
        message: 'Check out this link!',
        link: 'https://example.com',
      };

      const result = await postToFacebook(params);

      expect(result).toEqual({
        id: 'post-456',
        success: true,
      });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/page-123/feed',
        null,
        {
          params: {
            message: 'Check out this link!',
            access_token: 'test-token',
            link: 'https://example.com',
          },
        }
      );
    });

    it('should return error response on post failure', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Rate limit exceeded' },
          },
        },
      });

      const params: FacebookPostParams = {
        access_token: 'test-token',
        page_id: 'page-123',
        message: 'Test post',
      };

      const result = await postToFacebook(params);

      expect(result).toEqual({
        id: '',
        success: false,
        error: 'Rate limit exceeded',
      });
    });
  });

  describe('getFacebookAccessToken', () => {
    it('should exchange code for access token', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
          token_type: 'bearer',
        },
      });

      const result = await getFacebookAccessToken('auth-code', 'https://example.com/callback');

      expect(result).toEqual({
        access_token: 'new-access-token',
        token_type: 'bearer',
      });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/oauth/access_token',
        {
          params: {
            client_id: 'test-app-id',
            client_secret: 'test-app-secret',
            redirect_uri: 'https://example.com/callback',
            code: 'auth-code',
          },
        }
      );
    });

    it('should default to bearer token type', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
        },
      });

      const result = await getFacebookAccessToken('auth-code', 'https://example.com/callback');

      expect(result.token_type).toBe('bearer');
    });

    it('should throw error on token exchange failure', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Invalid authorization code' },
          },
        },
      });

      await expect(
        getFacebookAccessToken('invalid-code', 'https://example.com/callback')
      ).rejects.toThrow('Facebook token exchange failed: Invalid authorization code');
    });
  });

  describe('getFacebookLongLivedToken', () => {
    it('should exchange short-lived token for long-lived token', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          access_token: 'long-lived-token',
          expires_in: 5184000, // 60 days in seconds
        },
      });

      const result = await getFacebookLongLivedToken('short-lived-token');

      expect(result).toEqual({
        access_token: 'long-lived-token',
        expires_in: 5184000,
      });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/oauth/access_token',
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: 'test-app-id',
            client_secret: 'test-app-secret',
            fb_exchange_token: 'short-lived-token',
          },
        }
      );
    });

    it('should throw error on long-lived token exchange failure', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Token expired' },
          },
        },
      });

      await expect(getFacebookLongLivedToken('expired-token')).rejects.toThrow(
        'Facebook long-lived token exchange failed: Token expired'
      );
    });
  });

  describe('Type Exports', () => {
    it('should export FacebookProfile interface correctly', () => {
      const profile: FacebookProfile = {
        id: '123',
        name: 'Test',
        email: 'test@test.com',
      };
      expect(profile.id).toBe('123');
    });

    it('should export FacebookPage interface correctly', () => {
      const page: FacebookPage = {
        id: 'page-1',
        name: 'Test Page',
        access_token: 'token',
      };
      expect(page.id).toBe('page-1');
    });

    it('should export FacebookPostParams interface correctly', () => {
      const params: FacebookPostParams = {
        access_token: 'token',
        page_id: 'page-1',
        message: 'Hello',
      };
      expect(params.message).toBe('Hello');
    });

    it('should export FacebookPostResponse interface correctly', () => {
      const response: FacebookPostResponse = {
        id: 'post-1',
        success: true,
      };
      expect(response.success).toBe(true);
    });
  });
});
