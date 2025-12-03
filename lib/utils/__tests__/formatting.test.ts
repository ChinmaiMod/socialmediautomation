import {
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
} from '../formatting';

describe('Formatting Utils', () => {
  describe('formatNumber', () => {
    it('should format numbers with K suffix for thousands', () => {
      expect(formatNumber(500)).toBe('500');
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber(1000)).toBe('1.0K');
    });

    it('should format numbers with M suffix for millions', () => {
      expect(formatNumber(1500000)).toBe('1.5M');
      expect(formatNumber(1000000)).toBe('1.0M');
    });

    it('should handle edge cases', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(999)).toBe('999');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages with default precision', () => {
      expect(formatPercentage(50)).toBe('50.0%');
      expect(formatPercentage(12.3)).toBe('12.3%');
      expect(formatPercentage(100)).toBe('100.0%');
    });

    it('should respect custom decimal places', () => {
      expect(formatPercentage(12.345, 2)).toBe('12.35%');
      expect(formatPercentage(10, 0)).toBe('10%');
    });
  });

  describe('formatDate', () => {
    it('should format dates with default format', () => {
      const date = new Date('2025-12-02T10:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toContain('Dec');
      expect(formatted).toContain('2025');
    });

    it('should handle string dates', () => {
      const formatted = formatDate('2025-12-02');
      expect(formatted).toBeTruthy();
    });

    it('should use custom format string', () => {
      // Use UTC date to avoid timezone issues
      const date = new Date(Date.UTC(2025, 11, 2)); // December 2, 2025 UTC
      const formatted = formatDate(date, 'yyyy-MM-dd');
      expect(formatted).toMatch(/2025-12-0[12]/); // Accept Dec 1 or 2 due to timezone
    });
  });

  describe('truncate', () => {
    it('should not truncate short text', () => {
      expect(truncate('Short', 10)).toBe('Short');
    });

    it('should truncate long text with ellipsis', () => {
      expect(truncate('Hello World Test', 10)).toBe('Hello W...');
    });

    it('should handle edge cases', () => {
      expect(truncate('Test', 3)).toBe('...');
      expect(truncate('', 5)).toBe('');
    });
  });

  describe('formatContentPreview', () => {
    it('should remove newlines and extra spaces', () => {
      const content = 'Line one\n\nLine two   with spaces';
      const preview = formatContentPreview(content, 100);
      expect(preview).not.toContain('\n');
      expect(preview).toBe('Line one Line two with spaces');
    });

    it('should truncate long content', () => {
      const longContent = 'A'.repeat(200);
      const preview = formatContentPreview(longContent, 100);
      expect(preview.length).toBeLessThanOrEqual(100);
    });
  });

  describe('formatPlatformName', () => {
    it('should capitalize platform names correctly', () => {
      expect(formatPlatformName('linkedin')).toBe('LinkedIn');
      expect(formatPlatformName('facebook')).toBe('Facebook');
      expect(formatPlatformName('instagram')).toBe('Instagram');
      expect(formatPlatformName('pinterest')).toBe('Pinterest');
    });
  });

  describe('getPlatformColor', () => {
    it('should return correct brand colors', () => {
      expect(getPlatformColor('linkedin')).toBe('#0A66C2');
      expect(getPlatformColor('facebook')).toBe('#1877F2');
      expect(getPlatformColor('instagram')).toBe('#E4405F');
      expect(getPlatformColor('pinterest')).toBe('#BD081C');
    });
  });

  describe('getViralScoreColor', () => {
    it('should return green for high scores', () => {
      expect(getViralScoreColor(80)).toBe('#22C55E');
      expect(getViralScoreColor(100)).toBe('#22C55E');
    });

    it('should return yellow for medium-high scores', () => {
      expect(getViralScoreColor(60)).toBe('#EAB308');
      expect(getViralScoreColor(79)).toBe('#EAB308');
    });

    it('should return orange for medium scores', () => {
      expect(getViralScoreColor(40)).toBe('#F97316');
      expect(getViralScoreColor(59)).toBe('#F97316');
    });

    it('should return red for low scores', () => {
      expect(getViralScoreColor(0)).toBe('#EF4444');
      expect(getViralScoreColor(39)).toBe('#EF4444');
    });
  });

  describe('formatHashtags', () => {
    it('should add # prefix if missing', () => {
      expect(formatHashtags(['tech', 'ai'])).toBe('#tech #ai');
    });

    it('should not double # prefix', () => {
      expect(formatHashtags(['#tech', '#ai'])).toBe('#tech #ai');
    });

    it('should handle mixed input', () => {
      expect(formatHashtags(['tech', '#ai', 'social'])).toBe('#tech #ai #social');
    });
  });
});
