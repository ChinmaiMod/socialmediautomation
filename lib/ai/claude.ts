import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Re-export the anthropic client for direct usage
export { anthropic };

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Send a message to Claude and get a response
 */
export async function chat(
  messages: ClaudeMessage[],
  options?: {
    system?: string;
    model?: string;
    max_tokens?: number;
    temperature?: number;
  }
): Promise<ClaudeResponse> {
  const response = await anthropic.messages.create({
    model: options?.model || 'claude-sonnet-4-20250514',
    max_tokens: options?.max_tokens || 1024,
    system: options?.system,
    messages: messages,
    temperature: options?.temperature,
  });

  const textContent = response.content.find(block => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response');
  }

  return {
    content: textContent.text,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

/**
 * Generate a JSON response from Claude
 */
export async function generateJSON<T>(
  prompt: string,
  options?: {
    system?: string;
    model?: string;
    max_tokens?: number;
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
 * Analyze text using Claude
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
    }
  );

  return {
    result: response.result || response,
    confidence: response.confidence || 0.8,
    explanation: response.explanation || 'Analysis complete',
  };
}

export default {
  chat,
  generateJSON,
  analyze,
  anthropic,
};
