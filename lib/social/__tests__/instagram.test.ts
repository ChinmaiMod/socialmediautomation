import axios from 'axios';
import {
  getInstagramAccount,
  postToInstagram,
  postInstagramCarousel,
  InstagramProfile,
  InstagramPostParams,
  InstagramPostResponse,
} from '../instagram';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Instagram Social Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstagramAccount', () => {
    it('should fetch Instagram business account successfully', async () => {
      const mockResponse = {
        data: {
          instagram_business_account: {
            id: 'ig-123',
            username: 'testuser',
            name: 'Test User',
            account_type: 'BUSINESS',
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getInstagramAccount('page-token', 'fb-page-123');

      expect(result).toEqual({
        id: 'ig-123',
        username: 'testuser',
        name: 'Test User',
        account_type: 'BUSINESS',
      });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/fb-page-123',
        {
          params: {
            fields: 'instagram_business_account{id,username,name,account_type}',
            access_token: 'page-token',
          },
        }
      );
    });

    it('should return null when no Instagram account connected', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {},
      });

      const result = await getInstagramAccount('page-token', 'fb-page-123');

      expect(result).toBeNull();
    });

    it('should throw error on account fetch failure', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Invalid page token' },
          },
        },
      });

      await expect(getInstagramAccount('invalid-token', 'fb-page-123')).rejects.toThrow(
        'Instagram account fetch failed: Invalid page token'
      );
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(getInstagramAccount('token', 'page-123')).rejects.toThrow(
        'Instagram account fetch failed: Connection timeout'
      );
    });
  });

  describe('postToInstagram', () => {
    it('should return error when image_url is missing', async () => {
      const params: InstagramPostParams = {
        access_token: 'test-token',
        instagram_account_id: 'ig-123',
        caption: 'Test caption',
      };

      const result = await postToInstagram(params);

      expect(result).toEqual({
        id: '',
        success: false,
        error: 'Image URL is required for Instagram posts',
      });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle container creation failure', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Invalid image URL' },
          },
        },
      });

      const params: InstagramPostParams = {
        access_token: 'test-token',
        instagram_account_id: 'ig-123',
        caption: 'Test caption',
        image_url: 'https://invalid-url.com/image.jpg',
      };

      const result = await postToInstagram(params);

      expect(result).toEqual({
        id: '',
        success: false,
        error: 'Invalid image URL',
      });
    });

    it('should call correct endpoints for posting', async () => {
      // This test verifies the API calls are made correctly
      mockedAxios.post
        .mockResolvedValueOnce({ data: { id: 'container-123' } })
        .mockResolvedValueOnce({ data: { id: 'post-456' } });

      const params: InstagramPostParams = {
        access_token: 'test-token',
        instagram_account_id: 'ig-123',
        caption: 'Test caption',
        image_url: 'https://example.com/image.jpg',
      };

      const result = await postToInstagram(params);

      // Verify container creation call was made
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/ig-123/media',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            image_url: 'https://example.com/image.jpg',
            caption: 'Test caption',
            access_token: 'test-token',
          }),
        })
      );

      expect(result.success).toBe(true);
    }, 10000); // Increase timeout for this test
  });

  describe('postInstagramCarousel', () => {
    it('should reject carousel with less than 2 images', async () => {
      const result = await postInstagramCarousel(
        'test-token',
        'ig-123',
        'Test caption',
        ['https://example.com/single-image.jpg']
      );

      expect(result).toEqual({
        id: '',
        success: false,
        error: 'Carousel must have 2-10 images',
      });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should reject carousel with more than 10 images', async () => {
      const images = Array(11).fill('https://example.com/image.jpg');

      const result = await postInstagramCarousel(
        'test-token',
        'ig-123',
        'Test caption',
        images
      );

      expect(result).toEqual({
        id: '',
        success: false,
        error: 'Carousel must have 2-10 images',
      });
    });

    it('should handle carousel creation failure', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Media upload failed' },
          },
        },
      });

      const result = await postInstagramCarousel(
        'test-token',
        'ig-123',
        'Test caption',
        ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
      );

      expect(result).toEqual({
        id: '',
        success: false,
        error: 'Media upload failed',
      });
    });

    it('should call correct endpoints for carousel with valid images', async () => {
      // Mock all the API calls
      mockedAxios.post
        .mockResolvedValueOnce({ data: { id: 'item-1' } })
        .mockResolvedValueOnce({ data: { id: 'item-2' } })
        .mockResolvedValueOnce({ data: { id: 'carousel-123' } })
        .mockResolvedValueOnce({ data: { id: 'post-789' } });

      const result = await postInstagramCarousel(
        'test-token',
        'ig-123',
        'My carousel post',
        [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ]
      );

      // Verify carousel items were created
      expect(mockedAxios.post).toHaveBeenCalledTimes(4);
      expect(result.success).toBe(true);
      expect(result.id).toBe('post-789');
    }, 10000); // Increase timeout
  });

  describe('Type Exports', () => {
    it('should export InstagramProfile interface correctly', () => {
      const profile: InstagramProfile = {
        id: 'ig-123',
        username: 'testuser',
        name: 'Test User',
        account_type: 'BUSINESS',
      };
      expect(profile.account_type).toBe('BUSINESS');
    });

    it('should export InstagramPostParams interface correctly', () => {
      const params: InstagramPostParams = {
        access_token: 'token',
        instagram_account_id: 'ig-123',
        caption: 'Hello',
        image_url: 'https://example.com/image.jpg',
      };
      expect(params.caption).toBe('Hello');
    });

    it('should export InstagramPostResponse interface correctly', () => {
      const response: InstagramPostResponse = {
        id: 'post-1',
        success: true,
      };
      expect(response.success).toBe(true);
    });
  });
});
