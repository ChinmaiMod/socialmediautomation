import axios from 'axios';

export interface PinterestProfile {
  id: string;
  username: string;
  profile_image: string;
}

export interface PinterestBoard {
  id: string;
  name: string;
  description: string;
  privacy: string;
}

export interface PinterestPostParams {
  access_token: string;
  board_id: string;
  title: string;
  description: string;
  link?: string;
  media_source: {
    source_type: 'image_url' | 'image_base64';
    url?: string;
    data?: string;
  };
}

export interface PinterestPostResponse {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Get Pinterest user profile
 */
export async function getPinterestProfile(accessToken: string): Promise<PinterestProfile> {
  try {
    const response = await axios.get('https://api.pinterest.com/v5/user_account', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      id: response.data.id,
      username: response.data.username,
      profile_image: response.data.profile_image,
    };
  } catch (error: any) {
    throw new Error(`Pinterest profile fetch failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Get Pinterest boards for the user
 */
export async function getPinterestBoards(accessToken: string): Promise<PinterestBoard[]> {
  try {
    const response = await axios.get('https://api.pinterest.com/v5/boards', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        page_size: 100,
      },
    });

    return response.data.items.map((board: any) => ({
      id: board.id,
      name: board.name,
      description: board.description,
      privacy: board.privacy,
    }));
  } catch (error: any) {
    throw new Error(`Pinterest boards fetch failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Create a Pin on Pinterest
 */
export async function postToPinterest(params: PinterestPostParams): Promise<PinterestPostResponse> {
  try {
    const { access_token, board_id, title, description, link, media_source } = params;

    const postData: any = {
      board_id,
      title,
      description,
      media_source,
    };

    if (link) {
      postData.link = link;
    }

    const response = await axios.post(
      'https://api.pinterest.com/v5/pins',
      postData,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: response.data.id,
      success: true,
    };
  } catch (error: any) {
    console.error('Pinterest post error:', error.response?.data || error.message);
    return {
      id: '',
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * Exchange authorization code for access token
 */
export async function getPinterestAccessToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  try {
    const credentials = Buffer.from(
      `${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`
    ).toString('base64');

    const response = await axios.post(
      'https://api.pinterest.com/v5/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
    };
  } catch (error: any) {
    throw new Error(`Pinterest token exchange failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Refresh Pinterest access token
 */
export async function refreshPinterestToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  try {
    const credentials = Buffer.from(
      `${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`
    ).toString('base64');

    const response = await axios.post(
      'https://api.pinterest.com/v5/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
    };
  } catch (error: any) {
    throw new Error(`Pinterest token refresh failed: ${error.response?.data?.message || error.message}`);
  }
}

export default {
  getPinterestProfile,
  getPinterestBoards,
  postToPinterest,
  getPinterestAccessToken,
  refreshPinterestToken,
};
