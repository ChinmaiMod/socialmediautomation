'use client';

import React, { useState, useEffect } from 'react';
import { Check, ChevronDown, Loader2, Zap, Star, Sparkles } from 'lucide-react';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

interface ModelTiers {
  premium: ModelInfo[];
  standard: ModelInfo[];
  budget: ModelInfo[];
}

interface ModelConfig {
  default: string;
  content: string;
  analysis: string;
  research: string;
  simple: string;
}

interface ModelSelectorProps {
  useCase?: 'default' | 'content' | 'analysis' | 'research' | 'simple';
  onModelChange?: (model: string) => void;
  showTierBadge?: boolean;
}

const tierIcons = {
  premium: Star,
  standard: Zap,
  budget: Sparkles,
};

const tierColors = {
  premium: 'text-yellow-500',
  standard: 'text-blue-500',
  budget: 'text-green-500',
};

const tierLabels = {
  premium: 'Premium',
  standard: 'Standard',
  budget: 'Budget',
};

export default function ModelSelector({
  useCase = 'default',
  onModelChange,
  showTierBadge = true,
}: ModelSelectorProps) {
  const [tiers, setTiers] = useState<ModelTiers | null>(null);
  const [current, setCurrent] = useState<ModelConfig | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch available models and current configuration
  useEffect(() => {
    async function fetchModels() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/settings/models');
        const data = await response.json();
        
        if (data.success) {
          setTiers(data.data.tiers);
          setCurrent(data.data.current);
          
          // Set selected model based on use case
          const modelKey = useCase === 'default' ? 'default' : useCase;
          setSelectedModel(data.data.current[modelKey] || data.data.current.default);
        } else {
          setError(data.error || 'Failed to load models');
        }
      } catch (err) {
        setError('Failed to fetch model settings');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchModels();
  }, [useCase]);

  // Get model info from tiers
  const getModelInfo = (modelId: string): { model: ModelInfo; tier: string } | null => {
    if (!tiers) return null;
    
    for (const [tier, models] of Object.entries(tiers)) {
      const model = models.find(m => m.id === modelId);
      if (model) {
        return { model, tier };
      }
    }
    return null;
  };

  const selectedModelInfo = getModelInfo(selectedModel);

  // Handle model selection
  const handleSelectModel = async (modelId: string) => {
    setSelectedModel(modelId);
    setIsOpen(false);
    setTestResult(null);
    
    // Save to database
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useCase: useCase === 'default' ? null : useCase,
          model: modelId,
        }),
      });
      
      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to save model');
      } else {
        onModelChange?.(modelId);
      }
    } catch (err) {
      setError('Failed to save model selection');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Test selected model
  const handleTestModel = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/settings/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel }),
      });
      
      const data = await response.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: `✓ Model responded in ${data.data.latency}ms`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Model test failed',
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Failed to test model',
      });
      console.error(err);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-600">Loading models...</span>
      </div>
    );
  }

  if (error && !tiers) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          {useCase === 'default' ? 'Default AI Model' : `Model for ${useCase}`}
        </label>
        {isSaving && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving...
          </span>
        )}
      </div>

      {/* Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex items-center gap-3">
            {selectedModelInfo && showTierBadge && (
              <span className={tierColors[selectedModelInfo.tier as keyof typeof tierColors]}>
                {React.createElement(tierIcons[selectedModelInfo.tier as keyof typeof tierIcons], { className: 'w-4 h-4' })}
              </span>
            )}
            <div className="text-left">
              <div className="font-medium text-gray-900">
                {selectedModelInfo?.model.name || selectedModel}
              </div>
              <div className="text-xs text-gray-500">
                {selectedModelInfo?.model.provider || 'Custom model'}
              </div>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown menu */}
        {isOpen && tiers && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            {Object.entries(tiers).map(([tier, models]) => (
              <div key={tier}>
                {/* Tier header */}
                <div className="sticky top-0 px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className={tierColors[tier as keyof typeof tierColors]}>
                      {React.createElement(tierIcons[tier as keyof typeof tierIcons], { className: 'w-4 h-4' })}
                    </span>
                    <span className="font-medium text-gray-700">
                      {tierLabels[tier as keyof typeof tierLabels]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {tier === 'premium' && '• Best quality'}
                      {tier === 'standard' && '• Balanced'}
                      {tier === 'budget' && '• Cost-effective'}
                    </span>
                  </div>
                </div>
                
                {/* Models in tier */}
                {models.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelectModel(model.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 ${
                      selectedModel === model.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{model.name}</div>
                      <div className="text-xs text-gray-500">{model.provider} • {model.id}</div>
                    </div>
                    {selectedModel === model.id && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleTestModel}
          disabled={isTesting || !selectedModel}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Model'
          )}
        </button>
        
        {testResult && (
          <span className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
            {testResult.message}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
