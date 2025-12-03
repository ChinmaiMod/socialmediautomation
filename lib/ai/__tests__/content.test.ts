import { generateContent, analyzeViralPotential, ContentGenerationParams, GeneratedContent } from '../content';

// Mock the openrouter module
jest.mock('../openrouter', () => ({
  chat: jest.fn(),
  getConfiguredModel: jest.fn().mockResolvedValue('anthropic/claude-sonnet-4'),
}));

import { chat, getConfiguredModel } from '../openrouter';

const mockChat = chat as jest.MockedFunction<typeof chat>;

describe('Content Generation Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockNiche = {
    name: 'Technology',
    keywords: ['AI', 'automation', 'tech'],
    target_audience: 'tech professionals',
    content_themes: ['innovation', 'future of work'],
  };

  describe('generateContent', () => {
    it('should generate content with required fields', async () => {
      mockChat.mockResolvedValueOnce({
        content: JSON.stringify({
          content: 'This is viral content',
          hashtags: ['viral', 'content'],
          predicted_viral_score: 85,
          reasoning: 'Good hook and CTA',
        }),
        model: 'anthropic/claude-sonnet-4',
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      });

      const params: ContentGenerationParams = {
        niche: mockNiche,
        platform: 'linkedin',
        tone: 'professional',
      };

      const result = await generateContent(params);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(mockChat).toHaveBeenCalled();
    });

    it('should call getConfiguredModel with content task type', async () => {
      mockChat.mockResolvedValueOnce({
        content: JSON.stringify({
          content: 'Generated content',
          hashtags: [],
          predicted_viral_score: 75,
          reasoning: 'Test',
        }),
        model: 'anthropic/claude-sonnet-4',
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      });

      await generateContent({
        niche: mockNiche,
        platform: 'instagram',
        tone: 'casual',
      });

      expect(getConfiguredModel).toHaveBeenCalledWith('content');
    });

    it('should handle errors gracefully', async () => {
      mockChat.mockRejectedValueOnce(new Error('API Error'));

      await expect(generateContent({
        niche: mockNiche,
        platform: 'linkedin',
        tone: 'professional',
      })).rejects.toThrow();
    });

    it('should include trend topic when provided', async () => {
      mockChat.mockResolvedValueOnce({
        content: JSON.stringify({
          content: 'Content about trending AI',
          hashtags: ['AI', 'trending'],
          predicted_viral_score: 90,
          reasoning: 'Leverages trending topic',
        }),
        model: 'anthropic/claude-sonnet-4',
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      });

      await generateContent({
        niche: mockNiche,
        platform: 'linkedin',
        tone: 'professional',
        trend_topic: 'AI breakthrough announcement',
      });

      // Verify trend topic was included in the prompt
      expect(mockChat).toHaveBeenCalled();
      const callArgs = mockChat.mock.calls[0];
      expect(callArgs[0][0].content).toContain('AI breakthrough announcement');
    });
  });

  describe('analyzeViralPotential', () => {
    it('should analyze content and return metrics', async () => {
      mockChat.mockResolvedValueOnce({
        content: JSON.stringify({
          score: 75,
          analysis: 'Good hook and engagement potential',
          suggestions: ['Add more hashtags', 'Include a question'],
        }),
        model: 'anthropic/claude-sonnet-4',
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      });

      const result = await analyzeViralPotential(
        'Sample content to analyze',
        'linkedin',
        { name: 'Tech', keywords: ['AI', 'automation'] }
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('suggestions');
    });

    it('should use analysis model type', async () => {
      mockChat.mockResolvedValueOnce({
        content: JSON.stringify({
          score: 80,
          analysis: 'Test analysis',
          suggestions: [],
        }),
        model: 'anthropic/claude-sonnet-4',
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      });

      await analyzeViralPotential(
        'Test content',
        'instagram',
        { name: 'Lifestyle', keywords: ['health', 'wellness'] }
      );

      expect(getConfiguredModel).toHaveBeenCalledWith('analysis');
    });

    it('should return default values on parsing error', async () => {
      mockChat.mockResolvedValueOnce({
        content: 'Invalid JSON response',
        model: 'anthropic/claude-sonnet-4',
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      });

      const result = await analyzeViralPotential(
        'Test content',
        'linkedin',
        { name: 'Tech', keywords: ['AI'] }
      );

      expect(result.score).toBe(50);
      expect(result.suggestions).toEqual([]);
    });
  });
});
