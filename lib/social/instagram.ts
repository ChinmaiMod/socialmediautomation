import axios from 'axios';

export interface InstagramProfile {
  id: string;
  username: string;
  name: string;
  account_type: string;
}

export interface InstagramPostParams {
  access_token: string;
  instagram_account_id: string;
  caption: string;
  image_url?: string;
}

export interface InstagramPostResponse {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Get Instagram Business Account
 * Note: Requires a Facebook Page connected to an Instagram Business Account
 */
export async function getInstagramAccount(
  pageAccessToken: string,
  facebookPageId: string
): Promise<InstagramProfile | null> {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${facebookPageId}`,
      {
        params: {
          fields: 'instagram_business_account{id,username,name,account_type}',
          access_token: pageAccessToken,
        },
      }
    );

    if (!response.data.instagram_business_account) {
      return null;
    }

    return response.data.instagram_business_account;
  } catch (error: any) {
    throw new Error(`Instagram account fetch failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Post content to Instagram (2-step process)
 * Step 1: Create media container
 * Step 2: Publish container
 */
export async function postToInstagram(params: InstagramPostParams): Promise<InstagramPostResponse> {
  try {
    const { access_token, instagram_account_id, caption, image_url } = params;

    if (!image_url) {
      return {
        id: '',
        success: false,
        error: 'Image URL is required for Instagram posts',
      };
    }

    // Step 1: Create media container
    const containerResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${instagram_account_id}/media`,
      null,
      {
        params: {
          image_url,
          caption,
          access_token,
        },
      }
    );

    const creationId = containerResponse.data.id;

    // Wait a moment for media to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Publish the container
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${instagram_account_id}/media_publish`,
      null,
      {
        params: {
          creation_id: creationId,
          access_token,
        },
      }
    );

    return {
      id: publishResponse.data.id,
      success: true,
    };
  } catch (error: any) {
    console.error('Instagram post error:', error.response?.data || error.message);
    return {
      id: '',
      success: false,
      error: error.response?.data?.error?.message || error.message,
    };
  }
}

/**
 * Post a carousel (multiple images) to Instagram
 */
export async function postInstagramCarousel(
  accessToken: string,
  instagramAccountId: string,
  caption: string,
  imageUrls: string[]
): Promise<InstagramPostResponse> {
  try {
    if (imageUrls.length < 2 || imageUrls.length > 10) {
      return {
        id: '',
        success: false,
        error: 'Carousel must have 2-10 images',
      };
    }

    // Step 1: Create media containers for each image
    const containerIds = await Promise.all(
      imageUrls.map(async (imageUrl) => {
        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
          null,
          {
            params: {
              image_url: imageUrl,
              is_carousel_item: true,
              access_token: accessToken,
            },
          }
        );
        return response.data.id;
      })
    );

    // Step 2: Create carousel container
    const carouselResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
      null,
      {
        params: {
          media_type: 'CAROUSEL',
          caption,
          children: containerIds.join(','),
          access_token: accessToken,
        },
      }
    );

    const carouselId = carouselResponse.data.id;

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Publish carousel
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`,
      null,
      {
        params: {
          creation_id: carouselId,
          access_token: accessToken,
        },
      }
    );

    return {
      id: publishResponse.data.id,
      success: true,
    };
  } catch (error: any) {
    console.error('Instagram carousel post error:', error.response?.data || error.message);
    return {
      id: '',
      success: false,
      error: error.response?.data?.error?.message || error.message,
    };
  }
}

export default {
  getInstagramAccount,
  postToInstagram,
  postInstagramCarousel,
};
