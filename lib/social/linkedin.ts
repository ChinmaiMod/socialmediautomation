import axios from 'axios';

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  vanityName: string;
}

export interface LinkedInPostParams {
  access_token: string;
  person_urn?: string;
  author_urn?: string;
  text: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
}

export interface LinkedInPostResponse {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Get LinkedIn user profile
 */
export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  try {
    const response = await axios.get('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      id: response.data.id,
      firstName: response.data.localizedFirstName,
      lastName: response.data.localizedLastName,
      vanityName: response.data.vanityName || '',
    };
  } catch (error: any) {
    throw new Error(`LinkedIn profile fetch failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Post content to LinkedIn
 */
export async function postToLinkedIn(params: LinkedInPostParams): Promise<LinkedInPostResponse> {
  try {
    const { access_token, person_urn, author_urn, text, visibility = 'PUBLIC' } = params;

    const author = author_urn || (person_urn ? `urn:li:person:${person_urn}` : null);
    if (!author) {
      return {
        id: '',
        success: false,
        error: 'Missing LinkedIn author (person_urn or author_urn is required)',
      };
    }

    const postData = {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: text,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility,
      },
    };

    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      postData,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    return {
      id: response.data.id,
      success: true,
    };
  } catch (error: any) {
    console.error('LinkedIn post error:', error.response?.data || error.message);
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
export async function getLinkedInAccessToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; expires_in: number }> {
  try {
    const response = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
    };
  } catch (error: any) {
    throw new Error(`LinkedIn token exchange failed: ${error.response?.data?.error_description || error.message}`);
  }
}

/**
 * Refresh LinkedIn access token
 */
export async function refreshLinkedInToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  try {
    const response = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      null,
      {
        params: {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
    };
  } catch (error: any) {
    throw new Error(`LinkedIn token refresh failed: ${error.response?.data?.error_description || error.message}`);
  }
}

export default {
  getLinkedInProfile,
  postToLinkedIn,
  getLinkedInAccessToken,
  refreshLinkedInToken,
};
