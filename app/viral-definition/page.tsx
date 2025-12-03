'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';

interface ViralMetric {
  id: string;
  account_id: string;
  metric_name: string;
  weight: number;
  threshold: number;
  created_at: string;
  updated_at: string;
}

interface Account {
  id: string;
  platform: string;
  account_name: string;
}

interface FormData {
  metric_name: string;
  weight: number;
  threshold: number;
}

const DEFAULT_METRICS = [
  { metric_name: 'engagement_rate', weight: 30, threshold: 5 },
  { metric_name: 'shares', weight: 25, threshold: 100 },
  { metric_name: 'comments', weight: 20, threshold: 50 },
  { metric_name: 'reach_growth', weight: 15, threshold: 200 },
  { metric_name: 'saves', weight: 10, threshold: 25 },
];

export default function ViralDefinitionPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [metrics, setMetrics] = useState<ViralMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<ViralMetric | null>(null);
  const [formData, setFormData] = useState<FormData>({
    metric_name: '',
    weight: 0,
    threshold: 0,
  });

  // Calculate total weight
  const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
  const remainingWeight = 100 - totalWeight;

  // Fetch accounts
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch('/api/accounts');
        if (!response.ok) throw new Error('Failed to fetch accounts');
        const data = await response.json();
        setAccounts(data);
        if (data.length > 0) {
          setSelectedAccountId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load accounts');
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
  }, []);

  // Fetch viral definitions when account changes
  useEffect(() => {
    async function fetchMetrics() {
      if (!selectedAccountId) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/viral-definitions?account_id=${selectedAccountId}`);
        if (!response.ok) throw new Error('Failed to fetch viral definitions');
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load viral definitions');
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [selectedAccountId]);

  const handleCreateDefaults = async () => {
    if (!selectedAccountId) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/viral-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccountId,
          metrics: DEFAULT_METRICS,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create default metrics');
      }
      
      const data = await response.json();
      setMetrics(data);
      setSuccess('Default viral metrics created successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create defaults');
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setEditingMetric(null);
    setFormData({
      metric_name: '',
      weight: Math.min(remainingWeight, 20),
      threshold: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (metric: ViralMetric) => {
    setEditingMetric(metric);
    setFormData({
      metric_name: metric.metric_name,
      weight: metric.weight,
      threshold: metric.threshold,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedAccountId || !formData.metric_name) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Calculate new total weight
      let newTotal = formData.weight;
      metrics.forEach(m => {
        if (!editingMetric || m.id !== editingMetric.id) {
          newTotal += m.weight;
        }
      });
      
      if (newTotal > 100) {
        throw new Error(`Total weight cannot exceed 100%. Current: ${newTotal}%`);
      }
      
      // Update metrics array
      let updatedMetrics: { metric_name: string; weight: number; threshold: number }[];
      
      if (editingMetric) {
        updatedMetrics = metrics.map(m => 
          m.id === editingMetric.id 
            ? { metric_name: formData.metric_name, weight: formData.weight, threshold: formData.threshold }
            : { metric_name: m.metric_name, weight: m.weight, threshold: m.threshold }
        );
      } else {
        updatedMetrics = [
          ...metrics.map(m => ({ metric_name: m.metric_name, weight: m.weight, threshold: m.threshold })),
          formData,
        ];
      }
      
      const response = await fetch('/api/viral-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccountId,
          metrics: updatedMetrics,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save metric');
      }
      
      const data = await response.json();
      setMetrics(data);
      setIsModalOpen(false);
      setSuccess(editingMetric ? 'Metric updated successfully!' : 'Metric added successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save metric');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (metricId: string) => {
    if (!confirm('Are you sure you want to delete this metric?')) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const updatedMetrics = metrics
        .filter(m => m.id !== metricId)
        .map(m => ({ metric_name: m.metric_name, weight: m.weight, threshold: m.threshold }));
      
      const response = await fetch('/api/viral-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccountId,
          metrics: updatedMetrics,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete metric');
      }
      
      const data = await response.json();
      setMetrics(data);
      setSuccess('Metric deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete metric');
    } finally {
      setSaving(false);
    }
  };

  const getMetricLabel = (name: string): string => {
    const labels: Record<string, string> = {
      engagement_rate: 'Engagement Rate',
      shares: 'Shares',
      comments: 'Comments',
      reach_growth: 'Reach Growth',
      saves: 'Saves',
      likes: 'Likes',
      impressions: 'Impressions',
      clicks: 'Clicks',
    };
    return labels[name] || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getWeightColor = (weight: number): string => {
    if (weight >= 25) return 'bg-green-500';
    if (weight >= 15) return 'bg-blue-500';
    if (weight >= 10) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Viral Definition
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure what makes content "viral" for each account by setting metric weights and thresholds.
            </p>
          </div>

          {/* Account Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              title="Select an account"
            >
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.account_name} ({account.platform})
                </option>
              ))}
            </select>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <p className="text-green-700 dark:text-green-400">{success}</p>
            </div>
          )}

          {/* Weight Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Weight Distribution
              </h2>
              <span className={`text-sm font-medium ${totalWeight === 100 ? 'text-green-600' : totalWeight > 100 ? 'text-red-600' : 'text-yellow-600'}`}>
                Total: {totalWeight}%
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
              {metrics.map((metric, index) => (
                <div
                  key={metric.id}
                  className={`h-full ${getWeightColor(metric.weight)} ${index > 0 ? 'border-l border-white/30' : ''}`}
                  style={{ width: `${metric.weight}%` }}
                  title={`${getMetricLabel(metric.metric_name)}: ${metric.weight}%`}
                />
              ))}
              {remainingWeight > 0 && (
                <div 
                  className="h-full bg-gray-300 dark:bg-gray-600"
                  style={{ width: `${remainingWeight}%` }}
                  title={`Unassigned: ${remainingWeight}%`}
                />
              )}
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4">
              {metrics.map(metric => (
                <div key={metric.id} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getWeightColor(metric.weight)}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {getMetricLabel(metric.metric_name)} ({metric.weight}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Viral Metrics
              </h2>
              <div className="flex gap-2">
                {metrics.length === 0 && (
                  <button
                    onClick={handleCreateDefaults}
                    disabled={saving || !selectedAccountId}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    Use Defaults
                  </button>
                )}
                <button
                  onClick={openAddModal}
                  disabled={saving || !selectedAccountId || remainingWeight <= 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Add Metric
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                <p className="mt-2 text-gray-500">Loading metrics...</p>
              </div>
            ) : metrics.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-4">📊</div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No viral metrics configured for this account.
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Click "Use Defaults" to start with recommended metrics or "Add Metric" to create custom ones.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.map(metric => (
                  <div key={metric.id} className="p-6 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {getMetricLabel(metric.metric_name)}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getWeightColor(metric.weight)} text-white`}>
                          {metric.weight}% weight
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Viral threshold: <span className="font-medium">{metric.threshold}</span>
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(metric)}
                        title="Edit metric"
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(metric.id)}
                        title="Delete metric"
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
              How Viral Score is Calculated
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
              The viral score is a weighted combination of your configured metrics. Each metric contributes to the final score based on its weight percentage.
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• <strong>Weight:</strong> How much this metric contributes to the viral score (total must equal 100%)</li>
              <li>• <strong>Threshold:</strong> The minimum value for a post to be considered "viral" for this metric</li>
              <li>• Posts exceeding all thresholds are marked as viral content</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingMetric ? 'Edit Metric' : 'Add Metric'}
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Metric Name
                </label>
                {editingMetric ? (
                  <input
                    type="text"
                    value={getMetricLabel(formData.metric_name)}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                    placeholder="Metric name"
                  />
                ) : (
                  <select
                    value={formData.metric_name}
                    onChange={(e) => setFormData({ ...formData, metric_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    title="Select a metric"
                  >
                    <option value="">Select a metric</option>
                    <option value="engagement_rate">Engagement Rate</option>
                    <option value="shares">Shares</option>
                    <option value="comments">Comments</option>
                    <option value="likes">Likes</option>
                    <option value="reach_growth">Reach Growth</option>
                    <option value="saves">Saves</option>
                    <option value="impressions">Impressions</option>
                    <option value="clicks">Clicks</option>
                  </select>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Weight (%)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max={editingMetric ? (remainingWeight + editingMetric.weight) : remainingWeight}
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
                    className="flex-1"
                    title="Adjust weight percentage"
                  />
                  <input
                    type="number"
                    min="0"
                    max={editingMetric ? (remainingWeight + editingMetric.weight) : remainingWeight}
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Available: {editingMetric ? (remainingWeight + editingMetric.weight) : remainingWeight}%
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Viral Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter threshold value"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum value for content to be considered viral
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.metric_name || formData.weight <= 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingMetric ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
