import { Platform } from '../db';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Format a number with K/M suffix for large numbers
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Format a percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a date for display
 */
export function formatDate(date: string | Date, formatStr: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format content for preview (single line, truncated)
 */
export function formatContentPreview(content: string, maxLength: number = 100): string {
  // Remove newlines and extra spaces
  const singleLine = content.replace(/\s+/g, ' ').trim();
  return truncate(singleLine, maxLength);
}

/**
 * Format platform name for display
 */
export function formatPlatformName(platform: Platform): string {
  const names: Record<Platform, string> = {
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    instagram: 'Instagram',
    pinterest: 'Pinterest',
  };
  return names[platform] || platform;
}

/**
 * Get platform color for UI
 */
export function getPlatformColor(platform: Platform): string {
  const colors: Record<Platform, string> = {
    linkedin: '#0A66C2',
    facebook: '#1877F2',
    instagram: '#E4405F',
    pinterest: '#BD081C',
  };
  return colors[platform] || '#666666';
}

/**
 * Format viral score with color indicator
 */
export function getViralScoreColor(score: number): string {
  if (score >= 80) return '#22C55E'; // Green
  if (score >= 60) return '#EAB308'; // Yellow
  if (score >= 40) return '#F97316'; // Orange
  return '#EF4444'; // Red
}

/**
 * Format hashtags for display (with #)
 */
export function formatHashtags(hashtags: string[]): string {
  return hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
}

/**
 * Parse hashtags from content
 */
export function parseHashtags(content: string): string[] {
  const matches = content.match(/#[\w\u0080-\uFFFF]+/g);
  return matches ? matches.map(tag => tag.slice(1)) : [];
}

/**
 * Format engagement metrics for display
 */
export function formatEngagementMetrics(metrics: {
  likes: number;
  shares: number;
  comments: number;
  views: number;
}): string {
  return `${formatNumber(metrics.likes)} likes · ${formatNumber(metrics.shares)} shares · ${formatNumber(metrics.comments)} comments · ${formatNumber(metrics.views)} views`;
}

/**
 * Slugify a string for URLs
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a random color (for charts, etc.)
 */
export function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default {
  formatNumber,
  formatPercentage,
  formatDate,
  formatRelativeTime,
  truncate,
  formatContentPreview,
  formatPlatformName,
  getPlatformColor,
  getViralScoreColor,
  formatHashtags,
  parseHashtags,
  formatEngagementMetrics,
  slugify,
  generateRandomColor,
  formatBytes,
};
