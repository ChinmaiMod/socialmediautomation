import { chat, getConfiguredModel } from './openrouter';

export interface ContentGenerationParams {
  niche: {
    name: string;
    keywords: string[];
    target_audience: string;
    content_themes: string[];
  };
  platform: 'linkedin' | 'facebook' | 'instagram' | 'pinterest';
  tone: string;
  trend_topic?: string;
  viral_pattern?: {
    hook_example: string;
    content_structure: string;
    emotional_trigger: string;
  };
  custom_instructions?: string;
  max_length?: number;
}

export interface GeneratedContent {
  content: string;
  hashtags: string[];
  predicted_viral_score: number;
  reasoning: string;
}

const PLATFORM_GUIDELINES: Record<string, { maxLength: number; format: string }> = {
  linkedin: {
    maxLength: 3000,
    format: 'Professional, thought-leadership style. Use line breaks for readability. Include a call-to-action.',
  },
  facebook: {
    maxLength: 63206,
    format: 'Conversational and engaging. Can be longer form. Encourage comments and shares.',
  },
  instagram: {
    maxLength: 2200,
    format: 'Visual-first, emoji-friendly. Caption should complement the image concept. Hashtags at the end.',
  },
  pinterest: {
    maxLength: 500,
    format: 'Descriptive, keyword-rich. Focus on searchability and saving value.',
  },
};

export async function generateContent(params: ContentGenerationParams): Promise<GeneratedContent> {
  const { niche, platform, tone, trend_topic, viral_pattern, custom_instructions, max_length } = params;
  const guidelines = PLATFORM_GUIDELINES[platform];
  const effectiveMaxLength = max_length || guidelines.maxLength;

  const systemPrompt = `You are an expert social media content creator specializing in creating viral content. 
Your task is to generate highly engaging content that maximizes reach and engagement.

Platform: ${platform.toUpperCase()}
Format Guidelines: ${guidelines.format}
Maximum Length: ${effectiveMaxLength} characters

Always respond in valid JSON format with these fields:
- content: The post content (string)
- hashtags: Array of relevant hashtags without # symbol
- predicted_viral_score: A number 0-100 estimating viral potential
- reasoning: Brief explanation of why this content should perform well`;

  const userPrompt = `Generate a ${platform} post for the following:

NICHE: ${niche.name}
KEYWORDS: ${niche.keywords.join(', ')}
TARGET AUDIENCE: ${niche.target_audience}
CONTENT THEMES: ${niche.content_themes.join(', ')}
TONE: ${tone}

${trend_topic ? `TRENDING TOPIC TO INCORPORATE: ${trend_topic}` : ''}

${viral_pattern ? `
USE THIS VIRAL PATTERN:
- Hook Style: ${viral_pattern.hook_example}
- Content Structure: ${viral_pattern.content_structure}
- Emotional Trigger: ${viral_pattern.emotional_trigger}
` : ''}

${custom_instructions ? `ADDITIONAL INSTRUCTIONS: ${custom_instructions}` : ''}

Generate content that will maximize engagement and viral potential for this specific audience.`;

  // Get configured model for content generation
  const model = await getConfiguredModel('content');
  
  const response = await chat(
    [{ role: 'user', content: userPrompt }],
    {
      system: systemPrompt,
      max_tokens: 1024,
      model,
    }
  );

  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.content;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const result = JSON.parse(jsonStr.trim());
    return {
      content: result.content,
      hashtags: result.hashtags || [],
      predicted_viral_score: result.predicted_viral_score || 50,
      reasoning: result.reasoning || '',
    };
  } catch {
    // If JSON parsing fails, extract content manually
    return {
      content: response.content,
      hashtags: [],
      predicted_viral_score: 50,
      reasoning: 'Auto-generated content',
    };
  }
}

export async function analyzeViralPotential(
  content: string,
  platform: string,
  niche: { name: string; keywords: string[] }
): Promise<{ score: number; analysis: string; suggestions: string[] }> {
  const systemPrompt = `You are a viral content analyst. Analyze content and predict its viral potential.
Respond in JSON format with: score (0-100), analysis (brief explanation), suggestions (array of improvements).`;

  const userPrompt = `Analyze this ${platform} post for viral potential:

CONTENT: ${content}
NICHE: ${niche.name}
KEYWORDS: ${niche.keywords.join(', ')}

Consider: hook strength, emotional triggers, shareability, relevance, call-to-action, and platform optimization.`;

  // Use analysis model for viral potential scoring
  const model = await getConfiguredModel('analysis');
  
  const response = await chat(
    [{ role: 'user', content: userPrompt }],
    {
      system: systemPrompt,
      max_tokens: 512,
      model,
    }
  );

  try {
    let jsonStr = response.content;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    return JSON.parse(jsonStr.trim());
  } catch {
    return {
      score: 50,
      analysis: response.content,
      suggestions: [],
    };
  }
}

export default {
  generateContent,
  analyzeViralPotential,
};