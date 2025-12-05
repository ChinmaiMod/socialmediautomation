import OpenAI from 'openai';
import db from '../db';

// Default model - can be configured via environment variable or database
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4';

// Model tiers for different use cases
export type ModelTier = 'premium' | 'standard' | 'budget';

// Model info type
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

// Available models organized by tier (Updated December 2025)
export const AVAILABLE_MODELS: Record<ModelTier, ModelInfo[]> = {
  // High quality, best for content generation
  premium: [
    // Anthropic (Latest December 2025)
    { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic' },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    // OpenAI (Latest December 2025)
    { id: 'openai/gpt-4.5-turbo', name: 'GPT-4.5 Turbo', provider: 'OpenAI' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'openai/gpt-4o-2024-11-20', name: 'GPT-4o (Nov 2024)', provider: 'OpenAI' },
    { id: 'openai/o1', name: 'OpenAI o1', provider: 'OpenAI' },
    { id: 'openai/o1-preview', name: 'OpenAI o1 Preview', provider: 'OpenAI' },
    // Google (Latest December 2025)
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
    { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro Preview', provider: 'Google' },
    { id: 'google/gemini-2.0-pro', name: 'Gemini 2.0 Pro', provider: 'Google' },
    // xAI
    { id: 'x-ai/grok-2', name: 'Grok 2', provider: 'xAI' },
    { id: 'x-ai/grok-2-vision', name: 'Grok 2 Vision', provider: 'xAI' },
  ],
  // Cost-effective, good for trend research and analysis
  standard: [
    // Anthropic
    { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
    // OpenAI
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
    { id: 'openai/gpt-4o-mini-2024-07-18', name: 'GPT-4o Mini (Jul 2024)', provider: 'OpenAI' },
    { id: 'openai/o1-mini', name: 'OpenAI o1 Mini', provider: 'OpenAI' },
    { id: 'openai/o3-mini', name: 'OpenAI o3 Mini', provider: 'OpenAI' },
    // Google
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
    { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash Preview', provider: 'Google' },
    { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash 001', provider: 'Google' },
    // DeepSeek
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },
    // Mistral
    { id: 'mistralai/mistral-large-2411', name: 'Mistral Large (Nov 2024)', provider: 'Mistral' },
    { id: 'mistralai/mistral-medium', name: 'Mistral Medium', provider: 'Mistral' },
  ],
  // Budget-friendly, good for simple tasks
  budget: [
    // Free tier models
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', provider: 'Google' },
    { id: 'google/gemini-2.0-flash-thinking-exp:free', name: 'Gemini 2.0 Flash Thinking (Free)', provider: 'Google' },
    { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', provider: 'DeepSeek' },
    // Meta Llama
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta' },
    { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'Meta' },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
    // Mistral
    { id: 'mistralai/mistral-small-2409', name: 'Mistral Small', provider: 'Mistral' },
    { id: 'mistralai/mistral-nemo', name: 'Mistral Nemo', provider: 'Mistral' },
    // Qwen
    { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'Alibaba' },
    { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', provider: 'Alibaba' },
    // Cohere
    { id: 'cohere/command-r-plus', name: 'Command R+', provider: 'Cohere' },
    { id: 'cohere/command-r', name: 'Command R', provider: 'Cohere' },
  ],
};

// Flatten models for easy lookup
export const ALL_MODELS: ModelInfo[] = [
  ...AVAILABLE_MODELS.premium,
  ...AVAILABLE_MODELS.standard,
  ...AVAILABLE_MODELS.budget,
];

/**
 * Get the configured model for a specific use case from database settings
 */
export async function getConfiguredModel(useCase: 'content' | 'analysis' | 'research' | 'simple' = 'content'): Promise<string> {
  try {
    const settingKey = `openrouter_model_${useCase}`;
    const setting = await db.getSetting(settingKey);
    if (setting) {
      // Value is stored as JSON string, parse it
      const model = typeof setting === 'string' ? setting.replace(/^"|"$/g, '') : setting;
      return model as string;
    }
    
    // Fallback to default model setting
    const defaultSetting = await db.getSetting('openrouter_model');
    if (defaultSetting) {
      const model = typeof defaultSetting === 'string' ? defaultSetting.replace(/^"|"$/g, '') : defaultSetting;
      return model as string;
    }
  } catch (error) {
    console.warn('Failed to get configured model from database:', error);
  }
  
  // Final fallback to environment variable or hardcoded default
  return DEFAULT_MODEL;
}

/**
 * Get model info by ID
 */
export function getModelInfo(modelId: string): ModelInfo | undefined {
  return ALL_MODELS.find(m => m.id === modelId);
}

/**
 * Get tier for a model
 */
export function getModelTier(modelId: string): ModelTier | undefined {
  for (const [tier, models] of Object.entries(AVAILABLE_MODELS)) {
    if (models.some(m => m.id === modelId)) {
      return tier as ModelTier;
    }
  }
  return undefined;
}

// Dynamic client factory -- use DB key if present, else env var
let clientCache: { key: string; client: any } | null = null;
export async function getOpenRouterClient(overrideKey?: string): Promise<any> {
  const dbKey = await db.getSetting('openrouter_api_key');
  const key = overrideKey || (typeof dbKey === 'string' ? dbKey : null) || process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('No OpenRouter API key configured');
  if (clientCache && clientCache.client && clientCache.key === key) return clientCache.client;
  // Instantiate a new OpenAI client
  const client = new OpenAI({ apiKey: key, baseURL: 'https://openrouter.ai/api/v1' } as any);
  clientCache = { key, client };
  return client;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Send a message to the AI model via OpenRouter
 */
export async function chat(
  messages: ChatMessage[],
  options?: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
    system?: string;
    apiKey?: string;
  }
): Promise<ChatResponse> {
  const model = options?.model || DEFAULT_MODEL;
  
  // Prepare messages with system prompt if provided
  const formattedMessages: ChatMessage[] = [];
  if (options?.system) {
    formattedMessages.push({ role: 'system', content: options.system });
  }
  formattedMessages.push(...messages);

  const client = await getOpenRouterClient(options?.apiKey);
  const response = await client.chat.completions.create({
    model,
    max_tokens: options?.max_tokens || 1024,
    temperature: options?.temperature,
    messages: formattedMessages,
  });

  const choice = response.choices[0];
  if (!choice || !choice.message?.content) {
    throw new Error('No content in response');
  }

  return {
    content: choice.message.content,
    model: response.model,
    usage: {
      prompt_tokens: response.usage?.prompt_tokens || 0,
      completion_tokens: response.usage?.completion_tokens || 0,
      total_tokens: response.usage?.total_tokens || 0,
    },
  };
}

/**
 * Generate a JSON response from the AI
 */
export async function generateJSON<T>(
  prompt: string,
  options?: {
    model?: string;
    max_tokens?: number;
    system?: string;
    apiKey?: string;
  }
): Promise<T> {
  const systemPrompt = `${options?.system || ''}\n\nAlways respond with valid JSON only, no markdown code blocks or additional text.`;
  
  const response = await chat(
    [{ role: 'user', content: prompt }],
    { ...options, system: systemPrompt }
  );

  // Try to parse as JSON
  let jsonStr = response.content.trim();
  
  // Handle markdown code blocks if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  return JSON.parse(jsonStr) as T;
}

/**
 * Analyze text using AI
 */
export async function analyze(
  text: string,
  analysisType: 'sentiment' | 'topics' | 'engagement' | 'custom',
  customPrompt?: string
): Promise<{
  result: unknown;
  confidence: number;
  explanation: string;
}> {
  const prompts: Record<string, string> = {
    sentiment: `Analyze the sentiment of this text. Return JSON with: sentiment (positive/negative/neutral), score (-1 to 1), confidence (0-1), explanation.`,
    topics: `Extract the main topics from this text. Return JSON with: topics (array of strings), primary_topic (string), confidence (0-1), explanation.`,
    engagement: `Predict the engagement potential of this social media content. Return JSON with: engagement_score (0-100), factors (array of contributing factors), confidence (0-1), explanation.`,
    custom: customPrompt || 'Analyze this text.',
  };

  const response = await generateJSON<{
    result?: unknown;
    confidence?: number;
    explanation?: string;
    [key: string]: unknown;
  }>(
    `${prompts[analysisType]}\n\nText to analyze:\n${text}`,
    {
      system: 'You are an expert text analyst. Provide accurate, detailed analysis.',
      max_tokens: 512,
      model: AVAILABLE_MODELS.standard[0].id, // Use cost-effective model for analysis
    }
  );

  return {
    result: response.result || response,
    confidence: response.confidence || 0.8,
    explanation: response.explanation || 'Analysis complete',
  };
}

/**
 * Get available models from OpenRouter API (live fetch)
 */
export async function fetchAvailableModels(): Promise<ModelInfo[]> {
  try {
    const client = await getOpenRouterClient();
    const response = await client.models.list();
    const data = response?.data || [];
    return data.map((m: { id: string; name?: string }) => ({
      id: m.id,
      name: m.name || m.id,
      provider: m.id.split('/')[0] || 'Unknown',
    }));
  } catch (error) {
    console.error('Error fetching models from OpenRouter:', error);
    return ALL_MODELS;
  }
}

/**
 * Get curated available models (from our predefined list)
 */
export function getAvailableModels(): ModelInfo[] {
  return ALL_MODELS;
}

/**
 * Get model IDs only (for backward compatibility)
 */
export function getAvailableModelIds(): string[] {
  return ALL_MODELS.map(m => m.id);
}

export default {
  chat,
  generateJSON,
  analyze,
  AVAILABLE_MODELS,
  ALL_MODELS,
  DEFAULT_MODEL,
  getAvailableModels,
  getAvailableModelIds,
  fetchAvailableModels,
  getConfiguredModel,
  getModelInfo,
  getModelTier,
};
