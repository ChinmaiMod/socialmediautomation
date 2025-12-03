import axios from 'axios';
import {
  getLinkedInProfile,
  postToLinkedIn,
  getLinkedInAccessToken,
  refreshLinkedInToken,
  LinkedInProfile,
  LinkedInPostParams,
  LinkedInPostResponse,
} from '../linkedin';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LinkedIn Social Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LINKEDIN_CLIENT_ID = 'test-client-id';
    process.env.LINKEDIN_CLIENT_SECRET = 'test-client-secret';
  });

  describe('getLinkedInProfile', () => {
    it('should fetch LinkedIn profile successfully', async () => {
      const mockResponse = {
        data: {
          id: 'li-123',
          localizedFirstName: 'John',
          localizedLastName: 'Doe',
          vanityName: 'johndoe',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getLinkedInProfile('test-access-token');

      expect(result).toEqual({
        id: 'li-123',
        firstName: 'John',
        lastName: 'Doe',
        vanityName: 'johndoe',
      });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.linkedin.com/v2/me',
        {
          headers: {
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle missing vanityName', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 'li-123',
          localizedFirstName: 'Jane',
          localizedLastName: 'Smith',
        },
      });

      const result = await getLinkedInProfile('test-token');

      expect(result.vanityName).toBe('');
    });

    it('should throw error on profile fetch failure', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: { message: 'Invalid access token' },
        },
      });

      await expect(getLinkedInProfile('invalid-token')).rejects.toThrow(
        'LinkedIn profile fetch failed: Invalid access token'
      );
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(getLinkedInProfile('token')).rejects.toThrow(
        'LinkedIn profile fetch failed: Network error'
      );
    });
  });

  describe('postToLinkedIn', () => {
    it('should post to LinkedIn successfully with default visibility', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'post-123' },
      });

      const params: LinkedInPostParams = {
        access_token: 'test-token',
        person_urn: 'person-urn-123',
        text: 'Test LinkedIn post',
      };

      const result = await postToLinkedIn(params);

      expect(result).toEqual({
        id: 'post-123',
        success: true,
      });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author: 'urn:li:person:person-urn-123',
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: 'Test LinkedIn post',
              },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        },
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );
    });

    it('should post to LinkedIn with CONNECTIONS visibility', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'post-456' },
      });

      const params: LinkedInPostParams = {
        access_token: 'test-token',
        person_urn: 'person-urn-123',
        text: 'Private post',
        visibility: 'CONNECTIONS',
      };

      const result = await postToLinkedIn(params);

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.linkedin.com/v2/ugcPosts',
        expect.objectContaining({
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'CONNECTIONS',
          },
        }),
        expect.any(Object)
      );
    });

    it('should return error response on post failure', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { message: 'Rate limit exceeded' },
        },
      });

      const params: LinkedInPostParams = {
        access_token: 'test-token',
        person_urn: 'person-urn-123',
        text: 'Test post',
      };

      const result = await postToLinkedIn(params);

      expect(result).toEqual({
        id: '',
        success: false,
        error: 'Rate limit exceeded',
      });
    });
  });

  describe('getLinkedInAccessToken', () => {
    it('should exchange authorization code for access token', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
          expires_in: 5184000,
        },
      });

      const result = await getLinkedInAccessToken('auth-code', 'https://example.com/callback');

      expect(result).toEqual({
        access_token: 'new-access-token',
        expires_in: 5184000,
      });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://www.linkedin.com/oauth/v2/accessToken',
        null,
        {
          params: {
            grant_type: 'authorization_code',
            code: 'auth-code',
            redirect_uri: 'https://example.com/callback',
            client_id: 'test-client-id',
            client_secret: 'test-client-secret',
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    });

    it('should throw error on token exchange failure', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { error_description: 'Invalid authorization code' },
        },
      });

      await expect(
        getLinkedInAccessToken('invalid-code', 'https://example.com/callback')
      ).rejects.toThrow('LinkedIn token exchange failed: Invalid authorization code');
    });
  });

  describe('refreshLinkedInToken', () => {
    it('should refresh access token successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'refreshed-token',
          expires_in: 5184000,
        },
      });

      const result = await refreshLinkedInToken('refresh-token-123');

      expect(result).toEqual({
        access_token: 'refreshed-token',
        expires_in: 5184000,
      });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://www.linkedin.com/oauth/v2/accessToken',
        null,
        {
          params: {
            grant_type: 'refresh_token',
            refresh_token: 'refresh-token-123',
            client_id: 'test-client-id',
            client_secret: 'test-client-secret',
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    });

    it('should throw error on refresh failure', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { error_description: 'Refresh token expired' },
        },
      });

      await expect(refreshLinkedInToken('expired-refresh-token')).rejects.toThrow(
        'LinkedIn token refresh failed: Refresh token expired'
      );
    });
  });

  describe('Type Exports', () => {
    it('should export LinkedInProfile interface correctly', () => {
      const profile: LinkedInProfile = {
        id: 'li-123',
        firstName: 'John',
        lastName: 'Doe',
        vanityName: 'johndoe',
      };
      expect(profile.firstName).toBe('John');
    });

    it('should export LinkedInPostParams interface correctly', () => {
      const params: LinkedInPostParams = {
        access_token: 'token',
        person_urn: 'urn-123',
        text: 'Hello LinkedIn!',
        visibility: 'PUBLIC',
      };
      expect(params.visibility).toBe('PUBLIC');
    });

    it('should export LinkedInPostResponse interface correctly', () => {
      const response: LinkedInPostResponse = {
        id: 'post-1',
        success: true,
      };
      expect(response.success).toBe(true);
    });
  });
});
