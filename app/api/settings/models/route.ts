import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import {
  AVAILABLE_MODELS,
  ALL_MODELS,
  fetchAvailableModels,
  getConfiguredModel,
  ModelInfo,
  ModelTier,
} from '@/lib/ai/openrouter';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings/models
 * Get available models and current configuration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fetchLive = searchParams.get('live') === 'true';

    // Get current model configurations from database
    const [contentModel, analysisModel, researchModel, simpleModel, defaultModel] = await Promise.all([
      getConfiguredModel('content'),
      getConfiguredModel('analysis'),
      getConfiguredModel('research'),
      getConfiguredModel('simple'),
      db.getSetting('openrouter_model'),
    ]);

    // Get available models (either from OpenRouter API or our curated list)
    let availableModels: ModelInfo[];
    if (fetchLive) {
      availableModels = await fetchAvailableModels();
    } else {
      availableModels = ALL_MODELS;
    }

    return NextResponse.json({
      success: true,
      data: {
        // Current model configurations
        current: {
          default: defaultModel || 'anthropic/claude-sonnet-4',
          content: contentModel,
          analysis: analysisModel,
          research: researchModel,
          simple: simpleModel,
        },
        // Available models by tier
        tiers: AVAILABLE_MODELS,
        // All available models (flat list)
        models: availableModels,
        // Model tiers explanation
        tierDescriptions: {
          premium: 'High quality models for content generation. Best accuracy but higher cost.',
          standard: 'Cost-effective models for analysis and research. Good balance of quality and cost.',
          budget: 'Budget-friendly models for simple tasks. Some free options available.',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching model settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch model settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/models
 * Update model configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { useCase, model } = body;

    if (!model) {
      return NextResponse.json(
        { success: false, error: 'Model ID is required' },
        { status: 400 }
      );
    }

    // Validate model exists in our list (or allow custom models)
    const isKnownModel = ALL_MODELS.some(m => m.id === model);
    if (!isKnownModel) {
      // Allow custom models but log a warning
      console.warn(`Custom model selected: ${model}`);
    }

    // Determine which setting to update
    let settingKey: string;
    if (useCase && ['content', 'analysis', 'research', 'simple'].includes(useCase)) {
      settingKey = `openrouter_model_${useCase}`;
    } else {
      settingKey = 'openrouter_model';
    }

    // Update the setting
    await db.updateSetting(settingKey, JSON.stringify(model));

    return NextResponse.json({
      success: true,
      data: {
        settingKey,
        model,
        message: `Model ${useCase ? `for ${useCase}` : 'default'} updated to ${model}`,
      },
    });
  } catch (error) {
    console.error('Error updating model setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update model setting' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/models/test
 * Test a model with a simple prompt
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, prompt } = body;

    if (!model) {
      return NextResponse.json(
        { success: false, error: 'Model ID is required' },
        { status: 400 }
      );
    }

    const { chat } = await import('@/lib/ai/openrouter');

    const testPrompt = prompt || 'Say "Hello! The model is working correctly." in exactly those words.';
    
    const startTime = Date.now();
    const response = await chat(
      [{ role: 'user', content: testPrompt }],
      {
        model,
        max_tokens: 100,
        temperature: 0,
      }
    );
    const endTime = Date.now();

    return NextResponse.json({
      success: true,
      data: {
        model: response.model,
        response: response.content,
        latency: endTime - startTime,
        usage: response.usage,
      },
    });
  } catch (error) {
    console.error('Error testing model:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test model',
      },
      { status: 500 }
    );
  }
}
