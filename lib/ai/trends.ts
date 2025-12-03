import { chat, getConfiguredModel } from './openrouter';
import { differenceInDays, parseISO } from 'date-fns';

export interface TrendingTopicResult {
  topic: string;
  source_url: string | null;
  source_published_at: string | null;
  relevance_score: number;
  is_current_version: boolean;
  summary: string;
}

export interface TrendResearchParams {
  niche: {
    name: string;
    keywords: string[];
    target_audience: string;
  };
  max_results?: number;
  recency_days?: number;
}

// Version tracking for common tech products to validate trend recency
const CURRENT_VERSIONS: Record<string, { version: string; aliases: string[] }> = {
  'gemini': { version: '2.5', aliases: ['gemini 2.5', 'gemini flash 2.5', 'gemini pro 2.5'] },
  'gemini flash': { version: '2.5', aliases: ['gemini flash 2.5', 'flash 2.5'] },
  'veo': { version: '3', aliases: ['veo 3', 'veo3'] },
  'gpt': { version: '4o', aliases: ['gpt-4o', 'gpt4o', 'chatgpt 4o'] },
  'claude': { version: '3.5', aliases: ['claude 3.5', 'claude sonnet 3.5'] },
  'midjourney': { version: '6', aliases: ['midjourney v6', 'mj v6'] },
  'dall-e': { version: '3', aliases: ['dall-e 3', 'dalle 3'] },
  'stable diffusion': { version: '3', aliases: ['sd3', 'sdxl'] },
  'sora': { version: '1', aliases: ['sora 1.0'] },
};

/**
 * Validates that a topic references current versions of known products
 * Returns false if the topic mentions an outdated version
 */
export function validateTopicVersionRecency(topic: string): { isValid: boolean; reason?: string } {
  const lowerTopic = topic.toLowerCase();
  
  for (const [product, info] of Object.entries(CURRENT_VERSIONS)) {
    // Check if the topic mentions this product
    if (lowerTopic.includes(product)) {
      // Check for version numbers in the topic
      const versionPatterns = [
        /(\d+(?:\.\d+)?)/g, // Matches numbers like "2", "2.0", "2.5"
        /v(\d+)/gi,         // Matches "v2", "V3"
      ];
      
      for (const pattern of versionPatterns) {
        const matches = lowerTopic.match(pattern);
        if (matches) {
          for (const match of matches) {
            const versionNum = match.replace(/[vV]/g, '');
            const currentNum = parseFloat(info.version);
            const mentionedNum = parseFloat(versionNum);
            
            // If mentioned version is significantly older than current
            if (!isNaN(mentionedNum) && !isNaN(currentNum) && mentionedNum < currentNum - 0.5) {
              return {
                isValid: false,
                reason: `Topic mentions ${product} version ${versionNum}, but current version is ${info.version}`,
              };
            }
          }
        }
      }
    }
  }
  
  return { isValid: true };
}

/**
 * Validates that a topic's source is within the allowed recency window
 */
export function validateTopicRecency(
  sourcePublishedAt: string | null,
  maxAgeDays: number = 7
): { isValid: boolean; reason?: string } {
  if (!sourcePublishedAt) {
    return { isValid: true }; // If no date, assume it's current
  }
  
  try {
    const publishedDate = parseISO(sourcePublishedAt);
    const daysSincePublished = differenceInDays(new Date(), publishedDate);
    
    if (daysSincePublished > maxAgeDays) {
      return {
        isValid: false,
        reason: `Source is ${daysSincePublished} days old, exceeds ${maxAgeDays} day limit`,
      };
    }
    
    return { isValid: true };
  } catch {
    return { isValid: true }; // If date parsing fails, allow it
  }
}

/**
 * Research trending topics for a specific niche using AI with web search
 */
export async function researchTrendingTopics(
  params: TrendResearchParams
): Promise<TrendingTopicResult[]> {
  const { niche, max_results = 5, recency_days = 7 } = params;
  
  const systemPrompt = `You are a trend research specialist. Your job is to identify current, relevant trending topics for specific niches.

CRITICAL REQUIREMENTS:
1. Only include topics that have been actively discussed in the last ${recency_days} days
2. Verify that any product versions mentioned are CURRENT (e.g., Gemini Flash 2.5, not Gemini Flash 2.0)
3. Focus on topics specific to the given niche, not generic viral content
4. Prioritize topics with high engagement potential for the target audience

Current product versions to reference:
- Google Gemini: 2.5 (Flash and Pro)
- Google Veo: 3
- OpenAI GPT: 4o
- Claude: 3.5
- Midjourney: v6
- DALL-E: 3

Respond in JSON format with an array of objects containing:
- topic: The trending topic title
- source_url: URL where you found this trend (or null)
- source_published_at: ISO date string of when source was published (or null)
- relevance_score: 0-100 indicating relevance to the niche
- summary: Brief 1-2 sentence description of why this is trending`;

  const userPrompt = `Research current trending topics for:

NICHE: ${niche.name}
KEYWORDS: ${niche.keywords.join(', ')}
TARGET AUDIENCE: ${niche.target_audience}

Find ${max_results} highly relevant trending topics from the last ${recency_days} days that this audience would find valuable and engaging.

Important: Only include topics that are currently relevant - no outdated product announcements or old news.`;

  try {
    // Get configured model for trend research
    const model = await getConfiguredModel('research');
    
    const response = await chat(
      [{ role: 'user', content: userPrompt }],
      {
        system: systemPrompt,
        max_tokens: 2048,
        model,
      }
    );

    // Extract JSON from response
    let jsonStr = response.content;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const topics: TrendingTopicResult[] = JSON.parse(jsonStr.trim());
    
    // Filter and validate topics
    const validatedTopics = topics
      .map(topic => {
        // Validate version recency
        const versionCheck = validateTopicVersionRecency(topic.topic);
        if (!versionCheck.isValid) {
          console.log(`Rejecting topic: ${topic.topic} - ${versionCheck.reason}`);
          return null;
        }
        
        // Validate source date recency
        const dateCheck = validateTopicRecency(topic.source_published_at, recency_days);
        if (!dateCheck.isValid) {
          console.log(`Rejecting topic: ${topic.topic} - ${dateCheck.reason}`);
          return null;
        }
        
        return {
          ...topic,
          is_current_version: true,
        };
      })
      .filter((topic): topic is TrendingTopicResult => topic !== null);

    return validatedTopics;
  } catch (error) {
    console.error('Error researching trends:', error);
    return [];
  }
}

/**
 * Validate a manually entered topic for recency and version correctness
 */
export async function validateManualTopic(
  topic: string,
  niche: { name: string; keywords: string[] }
): Promise<{ isValid: boolean; issues: string[]; suggestions: string[] }> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check version recency
  const versionCheck = validateTopicVersionRecency(topic);
  if (!versionCheck.isValid) {
    issues.push(versionCheck.reason!);
    suggestions.push('Update the topic to reference the current product version');
  }
  
  // Use AI to validate topic relevance and timeliness
  try {
    const systemPrompt = `You are a content validation specialist. Analyze if a topic is current, relevant, and appropriate for the given niche.
Respond in JSON with: isTimely (boolean), issues (array of strings), suggestions (array of strings).`;

    const userPrompt = `Validate this topic:
TOPIC: ${topic}
NICHE: ${niche.name}
KEYWORDS: ${niche.keywords.join(', ')}

Check if:
1. This topic is still relevant (not outdated news)
2. Any product versions mentioned are current
3. It's appropriate for the niche
4. It has viral potential`;

    // Get configured model for validation
    const model = await getConfiguredModel('analysis');
    
    const response = await chat(
      [{ role: 'user', content: userPrompt }],
      {
        system: systemPrompt,
        max_tokens: 512,
        model,
      }
    );

    let jsonStr = response.content;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const aiValidation = JSON.parse(jsonStr.trim());
    if (!aiValidation.isTimely) {
      issues.push(...(aiValidation.issues || []));
    }
    suggestions.push(...(aiValidation.suggestions || []));
  } catch (error) {
    console.error('Error validating topic with AI:', error);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}

export default {
  researchTrendingTopics,
  validateTopicVersionRecency,
  validateTopicRecency,
  validateManualTopic,
  CURRENT_VERSIONS,
};