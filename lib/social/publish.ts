import axios from 'axios';

import type { Account, Platform } from '@/lib/db';
import { getLinkedInProfile, postToLinkedIn } from '@/lib/social/linkedin';
import { postToFacebook } from '@/lib/social/facebook';
import { postToInstagram } from '@/lib/social/instagram';
import { getPinterestBoards, getPinterestProfile, postToPinterest } from '@/lib/social/pinterest';
import { postToTwitter } from '@/lib/social/twitter';

export interface PublishInput {
  account: Account;
  content: string;
  hashtags?: string[];
  media_urls?: string[];
}

export interface PublishResult {
  success: boolean;
  external_post_id?: string | null;
  post_url?: string | null;
  error?: string;
}

function normalizeHashtag(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function buildFullText(content: string, hashtags?: string[]): string {
  const tags = (hashtags || []).map(normalizeHashtag).filter(Boolean);
  if (tags.length === 0) return content.trim();
  return `${content.trim()}\n\n${tags.join(' ')}`.trim();
}

function truncateWithEllipsis(text: string, max: number): string {
  if (text.length <= max) return text;
  if (max <= 1) return text.slice(0, max);
  return `${text.slice(0, max - 1)}…`;
}

async function getInstagramBusinessAccountId(userAccessToken: string): Promise<string | null> {
  const resp = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
    params: {
      access_token: userAccessToken,
      fields: 'id,name,instagram_business_account',
    },
  });

  const pages: any[] = resp.data?.data || [];
  const pageWithInstagram = pages.find((p) => p?.instagram_business_account?.id);
  return pageWithInstagram?.instagram_business_account?.id || null;
}

async function getInstagramProfilePictureUrl(instagramAccountId: string, userAccessToken: string): Promise<string | null> {
  try {
    const resp = await axios.get(`https://graph.facebook.com/v18.0/${instagramAccountId}`, {
      params: {
        access_token: userAccessToken,
        fields: 'profile_picture_url',
      },
    });
    return resp.data?.profile_picture_url || null;
  } catch {
    return null;
  }
}

function buildPostUrl(platform: Platform, externalId: string): string | null {
  if (!externalId) return null;
  switch (platform) {
    case 'twitter':
      return `https://twitter.com/i/web/status/${externalId}`;
    case 'facebook':
      // Often returned as "{page_id}_{post_id}" which FB can resolve.
      return `https://www.facebook.com/${externalId}`;
    case 'pinterest':
      return `https://www.pinterest.com/pin/${externalId}/`;
    default:
      return null;
  }
}

export async function publishToPlatform(input: PublishInput): Promise<PublishResult> {
  const { account } = input;
  const platform = account.platform;

  if (!account.access_token) {
    return { success: false, error: 'Missing access token for account' };
  }

  const accessToken = account.access_token;

  try {
    switch (platform) {
      case 'linkedin': {
        const text = truncateWithEllipsis(buildFullText(input.content, input.hashtags), 3000);

        const isOrganization = !!(account.username && /^\d+$/.test(account.username));
        const resp = isOrganization
          ? await postToLinkedIn({
              access_token: accessToken,
              author_urn: `urn:li:organization:${account.username}`,
              text,
              visibility: 'PUBLIC',
            })
          : await (async () => {
              const profile = await getLinkedInProfile(accessToken);
              return postToLinkedIn({
                access_token: accessToken,
                person_urn: profile.id,
                text,
                visibility: 'PUBLIC',
              });
            })();
        if (!resp.success) return { success: false, error: resp.error || 'LinkedIn post failed' };
        return {
          success: true,
          external_post_id: resp.id,
          post_url: buildPostUrl('linkedin', resp.id),
        };
      }

      case 'twitter': {
        const text = truncateWithEllipsis(buildFullText(input.content, input.hashtags), 280);
        const resp = await postToTwitter({ access_token: accessToken, text });
        if (!resp.success) return { success: false, error: resp.error || 'Twitter post failed' };
        return {
          success: true,
          external_post_id: resp.id,
          post_url: buildPostUrl('twitter', resp.id),
        };
      }

      case 'facebook': {
        const pageId = account.username;
        if (!pageId) {
          return { success: false, error: 'Facebook account is missing the Page ID. Please reconnect Facebook.' };
        }
        const message = buildFullText(input.content, input.hashtags);
        const resp = await postToFacebook({
          access_token: accessToken,
          page_id: pageId,
          message,
        });
        if (!resp.success) return { success: false, error: resp.error || 'Facebook post failed' };
        return {
          success: true,
          external_post_id: resp.id,
          post_url: buildPostUrl('facebook', resp.id),
        };
      }

      case 'instagram': {
        let instagramAccountId: string | null = null;
        if (account.username && /^\d+$/.test(account.username)) {
          instagramAccountId = account.username;
        } else {
          instagramAccountId = await getInstagramBusinessAccountId(accessToken);
        }
        if (!instagramAccountId) {
          return { success: false, error: 'No Instagram Business Account found (must be connected to a Facebook Page)' };
        }

        let imageUrl = input.media_urls?.[0] || null;
        if (!imageUrl) {
          imageUrl = await getInstagramProfilePictureUrl(instagramAccountId, accessToken);
        }
        if (!imageUrl) {
          return { success: false, error: 'Instagram requires an image URL (no media_urls provided and no profile picture available)' };
        }

        const caption = truncateWithEllipsis(buildFullText(input.content, input.hashtags), 2200);
        const resp = await postToInstagram({
          access_token: accessToken,
          instagram_account_id: instagramAccountId,
          caption,
          image_url: imageUrl,
        });
        if (!resp.success) return { success: false, error: resp.error || 'Instagram post failed' };
        return {
          success: true,
          external_post_id: resp.id,
          post_url: buildPostUrl('instagram', resp.id),
        };
      }

      case 'pinterest': {
        const boards = await getPinterestBoards(account.access_token);
        if (!boards.length) {
          return { success: false, error: 'No Pinterest boards found for this account' };
        }

        let imageUrl = input.media_urls?.[0] || null;
        if (!imageUrl) {
          const profile = await getPinterestProfile(account.access_token);
          imageUrl = profile.profile_image || null;
        }
        if (!imageUrl) {
          return { success: false, error: 'Pinterest requires an image URL (no media_urls provided and no profile image available)' };
        }

        const firstLine = input.content.split('\n').map((l) => l.trim()).find(Boolean) || 'New Pin';
        const title = truncateWithEllipsis(firstLine, 80);
        const description = truncateWithEllipsis(buildFullText(input.content, input.hashtags), 500);

        const resp = await postToPinterest({
          access_token: account.access_token,
          board_id: boards[0].id,
          title,
          description,
          media_source: {
            source_type: 'image_url',
            url: imageUrl,
          },
        });
        if (!resp.success) return { success: false, error: resp.error || 'Pinterest post failed' };
        return {
          success: true,
          external_post_id: resp.id,
          post_url: buildPostUrl('pinterest', resp.id),
        };
      }

      default:
        return { success: false, error: `Unsupported platform: ${platform}` };
    }
  } catch (err: any) {
    const message = err?.response?.data?.error?.message || err?.message || 'Unknown publish error';
    return { success: false, error: message };
  }
}
