/**
 * Error Path Tests
 * Comprehensive tests for error handling across all modules
 * These tests force API failures to cover catch blocks and error handling paths
 */

import axios from 'axios';

// Mock axios for social media modules
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Error Path Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
  });

  describe('Social Media API Errors', () => {
    describe('Facebook Errors', () => {
      const { 
        postToFacebook,
        getFacebookAccessToken,
        getFacebookLongLivedToken,
      } = require('../social/facebook');

      it('should handle Facebook Graph API error on postToFacebook', async () => {
        mockedAxios.post.mockRejectedValueOnce({
          response: {
            status: 400,
            data: { error: { message: 'Invalid post content', code: 190 } },
          },
        });
        
        const result = await postToFacebook({
          page_id: 'page-id',
          access_token: 'token',
          message: 'content',
        });
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should handle network error on getFacebookAccessToken', async () => {
        mockedAxios.get.mockRejectedValueOnce({
          code: 'ENOTFOUND',
          message: 'getaddrinfo ENOTFOUND graph.facebook.com',
        });
        
        await expect(getFacebookAccessToken('code', 'redirect')).rejects.toThrow();
      });

      it('should handle invalid code on getFacebookLongLivedToken', async () => {
        mockedAxios.get.mockRejectedValueOnce({
          response: {
            status: 400,
            data: { error: { message: 'Invalid short-lived token' } },
          },
        });
        
        await expect(getFacebookLongLivedToken('invalid-token')).rejects.toThrow();
      });
    });

    describe('Instagram Errors', () => {
      const {
        postToInstagram,
        postInstagramCarousel,
      } = require('../social/instagram');

      it('should handle media upload failure on postToInstagram', async () => {
        // First call succeeds (media container creation)
        mockedAxios.post.mockResolvedValueOnce({ data: { id: 'container-123' } });
        // Second call fails (publish)
        mockedAxios.post.mockRejectedValueOnce({
          response: {
            status: 500,
            data: { error: { message: 'Media processing failed' } },
          },
        });
        
        const result = await postToInstagram({
          instagram_user_id: 'ig-user',
          access_token: 'token',
          caption: 'caption',
          image_url: 'https://example.com/image.jpg',
        });
        
        expect(result.success).toBe(false);
      });

      it('should handle carousel media creation failure', async () => {
        mockedAxios.post.mockRejectedValueOnce({
          response: {
            status: 400,
            data: { error: { message: 'Invalid media URL' } },
          },
        });
        
        const result = await postInstagramCarousel(
          'ig-user', 
          'token', 
          'caption', 
          ['https://example.com/bad-image.jpg']
        );
        
        expect(result.success).toBe(false);
      });
    });

    describe('LinkedIn Errors', () => {
      const {
        postToLinkedIn,
        getLinkedInAccessToken,
        refreshLinkedInToken,
      } = require('../social/linkedin');

      it('should handle posting limit exceeded on postToLinkedIn', async () => {
        mockedAxios.post.mockRejectedValueOnce({
          response: {
            status: 429,
            data: { message: 'Daily posting limit exceeded' },
          },
        });
        
        const result = await postToLinkedIn({
          author_urn: 'urn:li:person:123',
          access_token: 'token',
          content: 'content',
        });
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should handle invalid authorization code', async () => {
        mockedAxios.post.mockRejectedValueOnce({
          response: {
            status: 400,
            data: { error: 'invalid_grant', error_description: 'Invalid code' },
          },
        });
        
        await expect(getLinkedInAccessToken('invalid-code', 'redirect')).rejects.toThrow();
      });

      it('should handle refresh token revoked', async () => {
        mockedAxios.post.mockRejectedValueOnce({
          response: {
            status: 401,
            data: { error: 'invalid_grant', error_description: 'Refresh token revoked' },
          },
        });
        
        await expect(refreshLinkedInToken('revoked-token')).rejects.toThrow();
      });
    });

    describe('Pinterest Errors', () => {
      const {
        postToPinterest,
        getPinterestAccessToken,
        refreshPinterestToken,
      } = require('../social/pinterest');

      it('should handle invalid board ID on postToPinterest', async () => {
        mockedAxios.post.mockRejectedValueOnce({
          response: {
            status: 404,
            data: { message: 'Board not found' },
          },
        });
        
        const result = await postToPinterest({
          board_id: 'invalid-board',
          access_token: 'token',
          title: 'title',
          description: 'desc',
          link: 'url',
          media_source: { source_type: 'image_url', url: 'image' },
        });
        
        expect(result.success).toBe(false);
      });

      it('should handle OAuth error on getPinterestAccessToken', async () => {
        mockedAxios.post.mockRejectedValueOnce({
          response: {
            status: 400,
            data: { error: 'invalid_request' },
          },
        });
        
        await expect(getPinterestAccessToken('bad-code', 'redirect')).rejects.toThrow();
      });

      it('should handle refresh with invalid token', async () => {
        mockedAxios.post.mockRejectedValueOnce({
          response: {
            status: 401,
            data: { error: 'invalid_token' },
          },
        });
        
        await expect(refreshPinterestToken('invalid-refresh')).rejects.toThrow();
      });
    });
  });

  describe('Validation Error Paths', () => {
    const { 
      validateUrl,
      validateEmail,
    } = require('../utils/validation');

    it('should return false for malformed URL', () => {
      const result = validateUrl('not-a-valid-url');
      expect(result).toBe(false);
    });

    it('should return false for malformed email', () => {
      const result = validateEmail('not-an-email');
      expect(result).toBe(false);
    });

    it('should return true for proper URL', () => {
      const result = validateUrl('https://example.com');
      expect(result).toBe(true);
    });

    it('should return true for proper email', () => {
      const result = validateEmail('test@example.com');
      expect(result).toBe(true);
    });
  });

  describe('Scoring Error Paths', () => {
    const { calculateViralScore, compareToAverage } = require('../utils/scoring');

    it('should handle zero average in compareToAverage', () => {
      const result = compareToAverage(100, 0);
      
      expect(result.percentageDiff).toBe(0);
      expect(result.analysis).toContain('No historical data');
    });

    it('should handle negative percentage difference', () => {
      const result = compareToAverage(50, 100);
      
      expect(result.percentageDiff).toBe(-50);
    });
  });

  describe('Formatting Edge Cases', () => {
    const { truncate } = require('../utils/formatting');

    it('should handle empty string', () => {
      const result = truncate('', 100);
      expect(result).toBe('');
    });

    it('should not truncate content shorter than limit', () => {
      const result = truncate('Short text', 100);
      expect(result).toBe('Short text');
    });

    it('should truncate content longer than limit', () => {
      const longText = 'A'.repeat(200);
      const result = truncate(longText, 100);
      expect(result.length).toBeLessThanOrEqual(103); // 100 + '...'
    });
  });
});

