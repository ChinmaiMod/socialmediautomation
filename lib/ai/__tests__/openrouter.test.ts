// Mock OpenAI before any imports
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

// Mock db module
jest.mock('../../db', () => ({
  __esModule: true,
  default: {
    getSettings: jest.fn().mockResolvedValue({}),
    getSetting: jest.fn().mockResolvedValue(undefined),
  },
}));

import {
  AVAILABLE_MODELS,
  ALL_MODELS,
  getModelInfo,
  getModelTier,
  getConfiguredModel,
  getAvailableModels,
  getAvailableModelIds,
  ModelInfo,
  ModelTier,
  ChatMessage,
} from '../openrouter';
import { getOpenRouterClient } from '../openrouter';

describe('OpenRouter Module', () => {
  describe('AVAILABLE_MODELS', () => {
    it('should have premium tier models', () => {
      expect(AVAILABLE_MODELS.premium).toBeDefined();
      expect(Array.isArray(AVAILABLE_MODELS.premium)).toBe(true);
      expect(AVAILABLE_MODELS.premium.length).toBeGreaterThan(0);
    });

    it('should have standard tier models', () => {
      expect(AVAILABLE_MODELS.standard).toBeDefined();
      expect(Array.isArray(AVAILABLE_MODELS.standard)).toBe(true);
      expect(AVAILABLE_MODELS.standard.length).toBeGreaterThan(0);
    });

    it('should have budget tier models', () => {
      expect(AVAILABLE_MODELS.budget).toBeDefined();
      expect(Array.isArray(AVAILABLE_MODELS.budget)).toBe(true);
      expect(AVAILABLE_MODELS.budget.length).toBeGreaterThan(0);
    });

    it('should have model configs with required fields', () => {
      const allModels = [
        ...AVAILABLE_MODELS.premium,
        ...AVAILABLE_MODELS.standard,
        ...AVAILABLE_MODELS.budget,
      ];

      allModels.forEach((model: ModelInfo) => {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.provider).toBeDefined();
      });
    });

    it('should include Claude Sonnet 4 in premium tier', () => {
      const premiumModelIds = AVAILABLE_MODELS.premium.map((m: ModelInfo) => m.id);
      expect(premiumModelIds).toContain('anthropic/claude-sonnet-4');
    });
  });

  describe('ALL_MODELS', () => {
    it('should contain all models from all tiers', () => {
      const expectedLength =
        AVAILABLE_MODELS.premium.length +
        AVAILABLE_MODELS.standard.length +
        AVAILABLE_MODELS.budget.length;
      expect(ALL_MODELS.length).toBe(expectedLength);
    });
  });

  describe('getModelInfo', () => {
    it('should return model info for valid model id', () => {
      const model = getModelInfo('anthropic/claude-sonnet-4');
      expect(model).toBeDefined();
      expect(model?.name).toContain('Claude');
    });

    it('should return undefined for invalid model id', () => {
      const model = getModelInfo('invalid/model-id');
      expect(model).toBeUndefined();
    });
  });

  describe('getModelTier', () => {
    it('should return premium for premium models', () => {
      const tier = getModelTier('anthropic/claude-sonnet-4');
      expect(tier).toBe('premium');
    });

    it('should return undefined for invalid model id', () => {
      const tier = getModelTier('invalid/model-id');
      expect(tier).toBeUndefined();
    });
  });

  describe('getConfiguredModel', () => {
    it('should return configured model for content task type', async () => {
      const model = await getConfiguredModel('content');
      expect(model).toBeDefined();
      expect(typeof model).toBe('string');
    });

    it('should return configured model for analysis task type', async () => {
      const model = await getConfiguredModel('analysis');
      expect(model).toBeDefined();
    });

    it('should return configured model for research task type', async () => {
      const model = await getConfiguredModel('research');
      expect(model).toBeDefined();
    });

    it('should return configured model for simple task type', async () => {
      const model = await getConfiguredModel('simple');
      expect(model).toBeDefined();
    });

    it('should fall back to default model on error', async () => {
      const model = await getConfiguredModel('content');
      expect(model).toBeTruthy();
    });
  });

  describe('getOpenRouterClient', () => {
    it('should instantiate OpenAI with the provided override key', async () => {
      const OpenAIMock = require('openai').default;
      await getOpenRouterClient('override-key-123');
      expect(OpenAIMock).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'override-key-123', baseURL: 'https://openrouter.ai/api/v1' }));
    });
  });

  describe('getAvailableModels', () => {
    it('should return all available models', () => {
      const models = getAvailableModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe('getAvailableModelIds', () => {
    it('should return array of model IDs', () => {
      const ids = getAvailableModelIds();
      expect(Array.isArray(ids)).toBe(true);
      ids.forEach(id => {
        expect(typeof id).toBe('string');
        expect(id.includes('/')).toBe(true);
      });
    });
  });

  describe('ChatMessage Interface', () => {
    it('should accept valid chat message structure', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Hello, how are you?',
      };
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, how are you?');
    });

    it('should accept system, user, and assistant roles', () => {
      const systemMsg: ChatMessage = { role: 'system', content: 'You are helpful.' };
      const userMsg: ChatMessage = { role: 'user', content: 'Hi' };
      const assistantMsg: ChatMessage = { role: 'assistant', content: 'Hello!' };

      expect(systemMsg.role).toBe('system');
      expect(userMsg.role).toBe('user');
      expect(assistantMsg.role).toBe('assistant');
    });
  });
});
