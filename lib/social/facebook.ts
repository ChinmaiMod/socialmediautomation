import axios from 'axios';

export interface FacebookProfile {
  id: string;
  name: string;
  email?: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

export interface FacebookPostParams {
  access_token: string;
  page_id: string;
  message: string;
  link?: string;
}

export interface FacebookPostResponse {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Get Facebook user profile
 */
export async function getFacebookProfile(accessToken: string): Promise<FacebookProfile> {
  try {
    const response = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: {
        fields: 'id,name,email',
        access_token: accessToken,
      },
    });

    return {
      id: response.data.id,
      name: response.data.name,
      email: response.data.email,
    };
  } catch (error: any) {
    throw new Error(`Facebook profile fetch failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Get Facebook Pages managed by the user
 */
export async function getFacebookPages(accessToken: string): Promise<FacebookPage[]> {
  try {
    const response = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: {
        access_token: accessToken,
      },
    });

    return response.data.data.map((page: any) => ({
      id: page.id,
      name: page.name,
      access_token: page.access_token,
    }));
  } catch (error: any) {
    throw new Error(`Facebook pages fetch failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Post content to Facebook Page
 */
export async function postToFacebook(params: FacebookPostParams): Promise<FacebookPostResponse> {
  try {
    const { access_token, page_id, message, link } = params;

    const postData: any = {
      message,
      access_token,
    };

    if (link) {
      postData.link = link;
    }

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${page_id}/feed`,
      null,
      {
        params: postData,
      }
    );

    return {
      id: response.data.id,
      success: true,
    };
  } catch (error: any) {
    console.error('Facebook post error:', error.response?.data || error.message);
    return {
      id: '',
      success: false,
      error: error.response?.data?.error?.message || error.message,
    };
  }
}

/**
 * Exchange authorization code for access token
 */
export async function getFacebookAccessToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; token_type: string }> {
  try {
    const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      },
    });

    return {
      access_token: response.data.access_token,
      token_type: response.data.token_type || 'bearer',
    };
  } catch (error: any) {
    throw new Error(`Facebook token exchange failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Get long-lived access token (60 days)
 */
export async function getFacebookLongLivedToken(
  shortLivedToken: string
): Promise<{ access_token: string; expires_in: number }> {
  try {
    const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    });

    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
    };
  } catch (error: any) {
    throw new Error(`Facebook long-lived token exchange failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

export default {
  getFacebookProfile,
  getFacebookPages,
  postToFacebook,
  getFacebookAccessToken,
  getFacebookLongLivedToken,
};
