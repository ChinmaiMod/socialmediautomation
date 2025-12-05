import { Platform } from '../db';

// Platform-specific content length limits
export const PLATFORM_LIMITS: Record<Platform, number> = {
  linkedin: 3000,
  facebook: 63206,
  instagram: 2200,
  pinterest: 500,
  twitter: 280,
};

// Optimal hashtag counts per platform
export const OPTIMAL_HASHTAGS: Record<Platform, { min: number; max: number }> = {
  linkedin: { min: 3, max: 5 },
  facebook: { min: 1, max: 3 },
  instagram: { min: 5, max: 15 },
  pinterest: { min: 2, max: 5 },
  twitter: { min: 1, max: 2 },
};

/**
 * Validate content length for a specific platform
 */
export function validateContentLength(content: string, platform: Platform): {
  isValid: boolean;
  length: number;
  maxLength: number;
  message?: string;
} {
  const maxLength = PLATFORM_LIMITS[platform];
  const length = content.length;
  const isValid = length <= maxLength;

  return {
    isValid,
    length,
    maxLength,
    message: isValid 
      ? undefined 
      : `Content exceeds ${platform} limit by ${length - maxLength} characters`,
  };
}

/**
 * Validate hashtag count for a platform
 */
export function validateHashtags(hashtags: string[], platform: Platform): {
  isValid: boolean;
  count: number;
  optimal: { min: number; max: number };
  message?: string;
} {
  const optimal = OPTIMAL_HASHTAGS[platform];
  const count = hashtags.length;
  const isValid = count >= optimal.min && count <= optimal.max;

  let message: string | undefined;
  if (count < optimal.min) {
    message = `Consider adding more hashtags. Optimal: ${optimal.min}-${optimal.max}`;
  } else if (count > optimal.max) {
    message = `Too many hashtags may reduce reach. Optimal: ${optimal.min}-${optimal.max}`;
  }

  return { isValid, count, optimal, message };
}

/**
 * Validate account data
 */
export function validateAccount(account: {
  name?: string;
  platform?: string;
  access_token?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!account.name || account.name.trim().length === 0) {
    errors.push('Account name is required');
  }

  if (!account.platform) {
    errors.push('Platform is required');
  } else if (!['linkedin', 'facebook', 'instagram', 'pinterest'].includes(account.platform)) {
    errors.push('Invalid platform. Must be: linkedin, facebook, instagram, or pinterest');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate viral definition weights (must sum to 1.0)
 */
export function validateViralDefinition(definition: {
  likes_weight?: number;
  shares_weight?: number;
  comments_weight?: number;
  views_weight?: number;
  saves_weight?: number;
  ctr_weight?: number;
}): { isValid: boolean; errors: string[]; totalWeight: number } {
  const errors: string[] = [];
  
  const weights = [
    definition.likes_weight || 0,
    definition.shares_weight || 0,
    definition.comments_weight || 0,
    definition.views_weight || 0,
    definition.saves_weight || 0,
    definition.ctr_weight || 0,
  ];

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  if (Math.abs(totalWeight - 1.0) > 0.01) {
    errors.push(`Weights must sum to 1.0 (currently ${totalWeight.toFixed(2)})`);
  }

  weights.forEach((w, i) => {
    if (w < 0 || w > 1) {
      const names = ['likes', 'shares', 'comments', 'views', 'saves', 'ctr'];
      errors.push(`${names[i]}_weight must be between 0 and 1`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    totalWeight,
  };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate cron expression
 */
export function validateCronExpression(cron: string): { isValid: boolean; error?: string } {
  const parts = cron.split(' ');
  
  if (parts.length !== 5) {
    return { isValid: false, error: 'Cron must have 5 parts: minute hour day month weekday' };
  }

  const ranges = [
    { name: 'minute', min: 0, max: 59 },
    { name: 'hour', min: 0, max: 23 },
    { name: 'day', min: 1, max: 31 },
    { name: 'month', min: 1, max: 12 },
    { name: 'weekday', min: 0, max: 6 },
  ];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const range = ranges[i];

    // Allow wildcards
    if (part === '*') continue;

    // Check for step values (*/5, 0-59/5)
    if (part.includes('/')) {
      const [, step] = part.split('/');
      if (isNaN(Number(step)) || Number(step) <= 0) {
        return { isValid: false, error: `Invalid step value in ${range.name}` };
      }
      continue;
    }

    // Check for ranges (0-5)
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (isNaN(start) || isNaN(end) || start > end || start < range.min || end > range.max) {
        return { isValid: false, error: `Invalid range in ${range.name}` };
      }
      continue;
    }

    // Check for lists (1,2,3)
    if (part.includes(',')) {
      const values = part.split(',').map(Number);
      for (const v of values) {
        if (isNaN(v) || v < range.min || v > range.max) {
          return { isValid: false, error: `Invalid value in ${range.name} list` };
        }
      }
      continue;
    }

    // Check single value
    const value = Number(part);
    if (isNaN(value) || value < range.min || value > range.max) {
      return { isValid: false, error: `${range.name} must be between ${range.min} and ${range.max}` };
    }
  }

  return { isValid: true };
}

export default {
  validateContentLength,
  validateHashtags,
  validateAccount,
  validateViralDefinition,
  validateUrl,
  validateEmail,
  validateCronExpression,
  PLATFORM_LIMITS,
  OPTIMAL_HASHTAGS,
};
