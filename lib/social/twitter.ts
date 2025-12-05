import axios from 'axios';

export interface TwitterProfile {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

export interface TwitterPostParams {
  access_token: string;
  text: string;
  reply_to_tweet_id?: string;
}

export interface TwitterPostResponse {
  id: string;
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * Get Twitter user profile using OAuth 2.0 token
 */
export async function getTwitterProfile(accessToken: string): Promise<TwitterProfile> {
  try {
    const response = await axios.get('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        'user.fields': 'id,name,username,profile_image_url',
      },
    });

    const user = response.data.data;
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      profile_image_url: user.profile_image_url,
    };
  } catch (error: any) {
    throw new Error(`Twitter profile fetch failed: ${error.response?.data?.detail || error.response?.data?.title || error.message}`);
  }
}

/**
 * Post a tweet using Twitter API v2
 */
export async function postToTwitter(params: TwitterPostParams): Promise<TwitterPostResponse> {
  try {
    const { access_token, text, reply_to_tweet_id } = params;

    interface TweetPayload {
      text: string;
      reply?: {
        in_reply_to_tweet_id: string;
      };
    }

    const payload: TweetPayload = { text };

    if (reply_to_tweet_id) {
      payload.reply = {
        in_reply_to_tweet_id: reply_to_tweet_id,
      };
    }

    const response = await axios.post(
      'https://api.twitter.com/2/tweets',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: response.data.data.id,
      text: response.data.data.text,
      success: true,
    };
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.title || 
                         error.response?.data?.errors?.[0]?.message ||
                         error.message;
    return {
      id: '',
      success: false,
      error: `Twitter post failed: ${errorMessage}`,
    };
  }
}

/**
 * Delete a tweet
 */
export async function deleteTweet(accessToken: string, tweetId: string): Promise<boolean> {
  try {
    await axios.delete(`https://api.twitter.com/2/tweets/${tweetId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return true;
  } catch (error: any) {
    throw new Error(`Tweet deletion failed: ${error.response?.data?.detail || error.message}`);
  }
}

/**
 * Refresh Twitter OAuth 2.0 access token
 */
export async function refreshTwitterToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
    };
  } catch (error: any) {
    throw new Error(`Twitter token refresh failed: ${error.response?.data?.error_description || error.message}`);
  }
}
