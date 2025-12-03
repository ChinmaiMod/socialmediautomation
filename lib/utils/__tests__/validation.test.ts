import {
  validateContentLength,
  validateHashtags,
  validateAccount,
  validateViralDefinition,
  validateUrl,
  validateEmail,
  validateCronExpression,
  PLATFORM_LIMITS,
  OPTIMAL_HASHTAGS,
} from '../validation';

describe('Validation Utils', () => {
  describe('PLATFORM_LIMITS', () => {
    it('should have limits for all supported platforms', () => {
      expect(PLATFORM_LIMITS.linkedin).toBe(3000);
      expect(PLATFORM_LIMITS.facebook).toBe(63206);
      expect(PLATFORM_LIMITS.instagram).toBe(2200);
      expect(PLATFORM_LIMITS.pinterest).toBe(500);
    });
  });

  describe('OPTIMAL_HASHTAGS', () => {
    it('should have optimal hashtag ranges for all platforms', () => {
      expect(OPTIMAL_HASHTAGS.linkedin).toEqual({ min: 3, max: 5 });
      expect(OPTIMAL_HASHTAGS.instagram).toEqual({ min: 5, max: 15 });
    });
  });

  describe('validateContentLength', () => {
    it('should return valid for content within limits', () => {
      const result = validateContentLength('Short post', 'linkedin');
      expect(result.isValid).toBe(true);
      expect(result.length).toBe(10);
      expect(result.maxLength).toBe(3000);
      expect(result.message).toBeUndefined();
    });

    it('should return invalid for content exceeding limits', () => {
      const longContent = 'A'.repeat(3500);
      const result = validateContentLength(longContent, 'linkedin');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('exceeds');
    });

    it('should validate content length for each platform', () => {
      const shortContent = 'Short post';
      const longContent = 'A'.repeat(5000);

      expect(validateContentLength(shortContent, 'linkedin').isValid).toBe(true);
      expect(validateContentLength(longContent, 'linkedin').isValid).toBe(false);

      expect(validateContentLength(shortContent, 'instagram').isValid).toBe(true);
      expect(validateContentLength('A'.repeat(2500), 'instagram').isValid).toBe(false);

      expect(validateContentLength(shortContent, 'pinterest').isValid).toBe(true);
      expect(validateContentLength('A'.repeat(600), 'pinterest').isValid).toBe(false);
    });
  });

  describe('validateHashtags', () => {
    it('should return valid for optimal hashtag count', () => {
      const hashtags = ['#ai', '#tech', '#automation', '#social'];
      const result = validateHashtags(hashtags, 'linkedin');
      expect(result.isValid).toBe(true);
      expect(result.count).toBe(4);
    });

    it('should return invalid for too few hashtags', () => {
      const result = validateHashtags(['#only'], 'linkedin');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Consider adding more');
    });

    it('should return invalid for too many hashtags', () => {
      const manyHashtags = Array(20).fill('#tag');
      const result = validateHashtags(manyHashtags, 'linkedin');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Too many');
    });
  });

  describe('validateAccount', () => {
    it('should validate a complete account', () => {
      const result = validateAccount({
        name: 'Test Account',
        platform: 'linkedin',
        access_token: 'token123',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing name', () => {
      const result = validateAccount({
        name: '',
        platform: 'linkedin',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Account name is required');
    });

    it('should return errors for invalid platform', () => {
      const result = validateAccount({
        name: 'Test',
        platform: 'twitter',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid platform');
    });

    it('should return errors for missing platform', () => {
      const result = validateAccount({
        name: 'Test',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Platform is required');
    });
  });

  describe('validateViralDefinition', () => {
    it('should validate weights that sum to 1.0', () => {
      const result = validateViralDefinition({
        likes_weight: 0.25,
        shares_weight: 0.25,
        comments_weight: 0.25,
        views_weight: 0.15,
        saves_weight: 0.05,
        ctr_weight: 0.05,
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalWeight).toBeCloseTo(1.0);
    });

    it('should return error when weights do not sum to 1.0', () => {
      const result = validateViralDefinition({
        likes_weight: 0.5,
        shares_weight: 0.1,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must sum to 1.0');
    });

    it('should return error for negative weights', () => {
      const result = validateViralDefinition({
        likes_weight: -0.5,
        shares_weight: 1.5,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('between 0 and 1'))).toBe(true);
    });

    it('should return error for weights greater than 1', () => {
      const result = validateViralDefinition({
        likes_weight: 1.5,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('between 0 and 1'))).toBe(true);
    });

    it('should handle missing weights as 0', () => {
      const result = validateViralDefinition({
        likes_weight: 1.0,
      });
      expect(result.isValid).toBe(true);
      expect(result.totalWeight).toBe(1.0);
    });
  });

  describe('validateUrl', () => {
    it('should return true for valid URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://localhost:3000')).toBe(true);
      expect(validateUrl('https://sub.domain.com/path?query=1')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('example.com')).toBe(false);
      expect(validateUrl('')).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should return true for valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@gmail.com')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validateCronExpression', () => {
    it('should validate correct cron expressions', () => {
      expect(validateCronExpression('0 8 * * *').isValid).toBe(true);
      expect(validateCronExpression('*/15 * * * *').isValid).toBe(true);
      expect(validateCronExpression('0 8,14,20 * * *').isValid).toBe(true);
      expect(validateCronExpression('0 9-17 * * 1-5').isValid).toBe(true);
    });

    it('should return error for wrong number of parts', () => {
      const result = validateCronExpression('0 8 *');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('5 parts');
    });

    it('should return error for invalid minute value', () => {
      const result = validateCronExpression('60 8 * * *');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('minute');
    });

    it('should return error for invalid hour value', () => {
      const result = validateCronExpression('0 25 * * *');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('hour');
    });

    it('should return error for invalid day value', () => {
      const result = validateCronExpression('0 8 32 * *');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('day');
    });

    it('should return error for invalid month value', () => {
      const result = validateCronExpression('0 8 * 13 *');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('month');
    });

    it('should return error for invalid weekday value', () => {
      const result = validateCronExpression('0 8 * * 7');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('weekday');
    });

    it('should return error for invalid step value', () => {
      const result = validateCronExpression('*/0 * * * *');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('step');
    });

    it('should return error for invalid range', () => {
      const result = validateCronExpression('0 17-9 * * *');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('range');
    });

    it('should return error for invalid list values', () => {
      const result = validateCronExpression('0 8,25 * * *');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('list');
    });
  });
});
