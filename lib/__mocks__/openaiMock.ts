/**
 * OpenAI SDK Singleton Mock
 * Provides sophisticated mocking for OpenAI client with singleton pattern
 */

export interface MockChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MockChatCompletionChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string;
  };
  finish_reason: 'stop' | 'length' | 'content_filter';
}

export interface MockChatCompletion {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: MockChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Singleton state
let mockResponseContent = 'Mock AI response';
let mockShouldError = false;
let mockErrorMessage = 'API Error';
let mockErrorType: 'api' | 'rate_limit' | 'auth' | 'network' = 'api';
let mockResponseDelay = 0;
let mockJsonResponse: any = null;

// Configure mock response
export function setMockResponse(content: string) {
  mockResponseContent = content;
  mockJsonResponse = null;
}

// Configure mock JSON response
export function setMockJsonResponse(json: any) {
  mockJsonResponse = json;
  mockResponseContent = JSON.stringify(json);
}

// Configure mock error
export function setMockError(shouldError: boolean, message = 'API Error', type: 'api' | 'rate_limit' | 'auth' | 'network' = 'api') {
  mockShouldError = shouldError;
  mockErrorMessage = message;
  mockErrorType = type;
}

// Configure response delay
export function setMockDelay(delayMs: number) {
  mockResponseDelay = delayMs;
}

// Reset all mocks
export function resetMock() {
  mockResponseContent = 'Mock AI response';
  mockShouldError = false;
  mockErrorMessage = 'API Error';
  mockErrorType = 'api';
  mockResponseDelay = 0;
  mockJsonResponse = null;
}

// Create error based on type
function createError(): Error {
  const error = new Error(mockErrorMessage) as any;
  
  switch (mockErrorType) {
    case 'rate_limit':
      error.status = 429;
      error.code = 'rate_limit_exceeded';
      break;
    case 'auth':
      error.status = 401;
      error.code = 'invalid_api_key';
      break;
    case 'network':
      error.code = 'ECONNREFUSED';
      break;
    default:
      error.status = 500;
      error.code = 'internal_error';
  }
  
  return error;
}

// Mock chat completions
const mockChatCompletions = {
  create: jest.fn().mockImplementation(async (params: {
    model: string;
    messages: MockChatCompletionMessage[];
    temperature?: number;
    max_tokens?: number;
  }): Promise<MockChatCompletion> => {
    // Apply delay if set
    if (mockResponseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, mockResponseDelay));
    }
    
    // Throw error if configured
    if (mockShouldError) {
      throw createError();
    }
    
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: params.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: mockResponseContent,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: params.messages.reduce((acc, m) => acc + m.content.length / 4, 0),
        completion_tokens: mockResponseContent.length / 4,
        total_tokens: 0, // Will be calculated
      },
    };
  }),
};

// Mock OpenAI class
export class MockOpenAI {
  apiKey: string;
  baseURL: string;
  defaultHeaders: Record<string, string>;
  
  chat = {
    completions: mockChatCompletions,
  };
  
  constructor(config?: {
    apiKey?: string;
    baseURL?: string;
    defaultHeaders?: Record<string, string>;
  }) {
    this.apiKey = config?.apiKey || 'mock-api-key';
    this.baseURL = config?.baseURL || 'https://api.openai.com/v1';
    this.defaultHeaders = config?.defaultHeaders || {};
  }
}

// Export singleton instance for direct replacement
export const mockOpenAIInstance = new MockOpenAI();

// Export mock functions for test assertions
export const mockCreate = mockChatCompletions.create;

export default MockOpenAI;
