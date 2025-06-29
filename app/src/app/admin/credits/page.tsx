'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Button, Card, Input } from '@/components/ui';
import { getAllCreditConfigs } from '@/lib/credits';
import { supabase } from '@/lib/supabase';
import type { CreditConfig } from '@/types';
import { Save, RefreshCw, Settings } from 'lucide-react';

export default function AdminCreditsPage() {
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const [configs, setConfigs] = useState<CreditConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 权限检查
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [authLoading, user, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      loadConfigs();
    }
  }, [isAdmin]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAllCreditConfigs();
      setConfigs(data);
    } catch (err) {
      console.error('加载积分配置失败:', err);
      setError('加载积分配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (configKey: string, value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 0) return;

    setConfigs(prev => prev.map(config => 
      config.config_key === configKey 
        ? { ...config, config_value: numValue }
        : config
    ));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // 批量更新配置
      for (const config of configs) {
        const { error } = await supabase
          .from('credit_configs')
          .update({
            config_value: config.config_value,
            updated_at: new Date().toISOString()
          })
          .eq('id', config.id);

        if (error) throw error;
      }

      setSuccess('积分配置已保存！');
    } catch (err) {
      console.error('保存积分配置失败:', err);
      setError(err instanceof Error ? err.message : '保存积分配置失败');
    } finally {
      setSaving(false);
    }
  };

  const getConfigDisplayName = (configKey: string): string => {
    const nameMap: Record<string, string> = {
      'register_bonus': '注册奖励积分',
      'upload_bonus': '项目上传基础奖励',
      'docker_multiplier': 'Docker化项目奖励倍数',
      'review_bonus': '评价项目奖励积分',
      'daily_signin_bonus': '每日签到奖励积分',
      'referral_bonus': '推荐新用户奖励积分',
      'min_purchase_amount': '最小购买金额（积分）',
      'max_daily_earn': '每日最大获得积分限制'
    };
    return nameMap[configKey] || configKey;
  };

  const getConfigDescription = (configKey: string): string => {
    const descMap: Record<string, string> = {
      'register_bonus': '新用户注册时获得的积分奖励',
      'upload_bonus': '项目审核通过时的基础积分奖励',
      'docker_multiplier': 'Docker化项目的奖励倍数（基础奖励 × 倍数）',
      'review_bonus': '用户评价项目时获得的积分奖励',
      'daily_signin_bonus': '每日签到获得的积分奖励',
      'referral_bonus': '成功推荐新用户注册时的积分奖励',
      'min_purchase_amount': '购买项目时的最小积分消费金额',
      'max_daily_earn': '用户每日最多可获得的积分数量限制'
    };
    return descMap[configKey] || '';
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 页面标题 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">积分配置管理</h1>
            </div>
            <p className="text-gray-600">管理平台积分系统的各项配置参数</p>
          </div>

          {/* 错误和成功消息 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="text-red-800">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="text-green-800">{success}</div>
            </div>
          )}

          {/* 配置表单 */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">积分规则配置</h2>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={loadConfigs}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? '保存中...' : '保存配置'}
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {configs.map((config) => (
                <div key={config.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-900">
                      {getConfigDisplayName(config.config_key)}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={config.config_value}
                        onChange={(e) => handleConfigChange(config.config_key, e.target.value)}
                        className="w-24 text-right"
                      />
                      <span className="text-sm text-gray-500">
                        {config.config_key.includes('multiplier') ? '倍' : '积分'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {getConfigDescription(config.config_key)}
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    配置键: {config.config_key}
                  </div>
                </div>
              ))}
            </div>

            {configs.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-gray-500">暂无积分配置数据</div>
              </div>
            )}
          </Card>

          {/* 积分规则说明 */}
          <Card className="mt-6 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">积分规则说明</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <strong>注册奖励：</strong>新用户注册时自动发放的积分，用于鼓励用户注册。
              </div>
              <div>
                <strong>项目上传奖励：</strong>项目审核通过后发放给卖家的基础积分奖励。
              </div>
              <div>
                <strong>Docker化奖励：</strong>如果项目支持Docker部署，将获得基础奖励的倍数奖励。
              </div>
              <div>
                <strong>评价奖励：</strong>用户评价项目后获得的积分奖励，鼓励用户参与评价。
              </div>
              <div>
                <strong>推荐奖励：</strong>成功推荐新用户注册时获得的积分奖励。
              </div>
              <div>
                <strong>每日限制：</strong>防止积分滥用，限制用户每日最大获得积分数量。
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
