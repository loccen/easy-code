'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Button, Card, Input } from '@/components/ui';
import { getAllCreditConfigs, searchUsers, getUserWithCredits, adminAdjustUserCredits, getAdminCreditOperations } from '@/lib/credits';
import { supabase } from '@/lib/supabase';
import type { CreditConfig, UserSearchResult, UserWithCredits, AdminCreditOperation } from '@/types';
import { Save, RefreshCw, Settings, Search, Plus, Minus, User, History } from 'lucide-react';

export default function AdminCreditsPage() {
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const [configs, setConfigs] = useState<CreditConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 用户积分管理相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithCredits | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [operationType, setOperationType] = useState<'add' | 'subtract'>('add');
  const [operationHistory, setOperationHistory] = useState<AdminCreditOperation[]>([]);
  const [userManagementError, setUserManagementError] = useState('');
  const [userManagementSuccess, setUserManagementSuccess] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [adjustLoading, setAdjustLoading] = useState(false);

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
      loadOperationHistory();
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

  // 用户积分管理相关函数
  const handleSearchUsers = async () => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      setUserManagementError('请输入搜索关键词');
      return;
    }

    if (query.length < 2) {
      setUserManagementError('搜索关键词至少需要2个字符');
      return;
    }

    try {
      setSearchLoading(true);
      setUserManagementError('');
      const results = await searchUsers(query);
      setSearchResults(results);

      if (results.length === 0) {
        setUserManagementError('未找到匹配的用户，请尝试其他关键词');
      }
    } catch (err) {
      console.error('搜索用户失败:', err);
      setUserManagementError('搜索用户失败，请稍后重试');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectUser = async (selectedUserData: UserSearchResult) => {
    try {
      setUserManagementError('');
      const userWithCredits = await getUserWithCredits(selectedUserData.id);
      setSelectedUser(userWithCredits);
      setSearchResults([]);
      setSearchQuery('');
    } catch (err) {
      console.error('获取用户信息失败:', err);
      setUserManagementError('获取用户信息失败');
    }
  };

  const validateCreditAdjustment = (): string | null => {
    if (!selectedUser) {
      return '请先选择要操作的用户';
    }

    if (!creditAmount.trim()) {
      return '请输入积分数量';
    }

    const amount = parseInt(creditAmount);
    if (isNaN(amount)) {
      return '积分数量必须是数字';
    }

    if (amount <= 0) {
      return '积分数量必须大于0';
    }

    if (amount > 1000000) {
      return '单次调整积分不能超过100万';
    }

    if (!adjustReason.trim()) {
      return '请输入调整原因';
    }

    if (adjustReason.trim().length < 2) {
      return '调整原因至少需要2个字符';
    }

    if (adjustReason.trim().length > 100) {
      return '调整原因不能超过100个字符';
    }

    // 检查减少积分时是否超过用户当前余额
    if (operationType === 'subtract') {
      const currentCredits = selectedUser.credits?.available_credits || 0;
      if (amount > currentCredits) {
        return `用户当前积分余额不足，仅有 ${currentCredits.toLocaleString()} 积分`;
      }
    }

    return null;
  };

  const handleAdjustCredits = async () => {
    // 表单验证
    const validationError = validateCreditAdjustment();
    if (validationError) {
      setUserManagementError(validationError);
      return;
    }

    const amount = parseInt(creditAmount);

    try {
      setAdjustLoading(true);
      setUserManagementError('');
      setUserManagementSuccess('');

      await adminAdjustUserCredits(
        user!.id,
        selectedUser!.id,
        amount,
        adjustReason.trim(),
        operationType === 'add'
      );

      // 刷新用户信息和操作历史
      const updatedUser = await getUserWithCredits(selectedUser!.id);
      setSelectedUser(updatedUser);
      await loadOperationHistory();

      // 清空表单
      setCreditAmount('');
      setAdjustReason('');

      const operationText = operationType === 'add' ? '增加' : '减少';
      setUserManagementSuccess(
        `成功为用户 ${selectedUser!.username} ${operationText}积分 ${amount.toLocaleString()}`
      );

      // 3秒后自动清除成功消息
      setTimeout(() => {
        setUserManagementSuccess('');
      }, 3000);
    } catch (err) {
      console.error('调整积分失败:', err);
      const errorMessage = err instanceof Error ? err.message : '调整积分失败，请稍后重试';
      setUserManagementError(errorMessage);
    } finally {
      setAdjustLoading(false);
    }
  };

  const loadOperationHistory = async () => {
    try {
      const history = await getAdminCreditOperations(20);
      setOperationHistory(history);
    } catch (err) {
      console.error('加载操作历史失败:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setCreditAmount('');
    setAdjustReason('');
    setUserManagementError('');
    setUserManagementSuccess('');
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

          {/* 用户积分管理 */}
          <Card className="mt-8 p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">用户积分管理</h2>
            </div>

            {/* 用户管理错误和成功消息 */}
            {userManagementError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-red-800 text-sm">{userManagementError}</div>
              </div>
            )}

            {userManagementSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="text-green-800 text-sm">{userManagementSuccess}</div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左侧：用户搜索和信息 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    搜索用户
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="输入用户名或邮箱"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchUsers();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSearchUsers}
                      disabled={searchLoading}
                      variant="outline"
                    >
                      <Search className={`w-4 h-4 ${searchLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>

                {/* 搜索结果 */}
                {searchResults.length > 0 && (
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handleSelectUser(user)}
                      >
                        <div className="font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400">
                          {user.role} • 注册于 {formatDate(user.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 选中的用户信息 */}
                {selectedUser && (
                  <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">当前选中用户</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelectedUser}
                        className="text-xs"
                      >
                        清除选择
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">用户名:</span>
                        <span className="font-medium">{selectedUser.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">邮箱:</span>
                        <span className="font-medium">{selectedUser.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">角色:</span>
                        <span className="font-medium">{selectedUser.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">当前积分:</span>
                        <span className="font-bold text-blue-600">
                          {selectedUser.credits?.available_credits?.toLocaleString() || 0} 积分
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 右侧：积分操作 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    积分操作
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <Button
                      variant={operationType === 'add' ? 'primary' : 'outline'}
                      onClick={() => setOperationType('add')}
                      className="flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      增加积分
                    </Button>
                    <Button
                      variant={operationType === 'subtract' ? 'primary' : 'outline'}
                      onClick={() => setOperationType('subtract')}
                      className="flex items-center justify-center gap-2"
                    >
                      <Minus className="w-4 h-4" />
                      减少积分
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    积分数量
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="请输入积分数量"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    操作原因
                  </label>
                  <Input
                    type="text"
                    placeholder="请输入调整原因"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleAdjustCredits}
                  disabled={!selectedUser || adjustLoading}
                  className="w-full"
                >
                  {adjustLoading ? '处理中...' : `${operationType === 'add' ? '增加' : '减少'}积分`}
                </Button>
              </div>
            </div>
          </Card>

          {/* 操作历史记录 */}
          <Card className="mt-6 p-6">
            <div className="flex items-center gap-3 mb-4">
              <History className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">最近操作记录</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={loadOperationHistory}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                刷新
              </Button>
            </div>

            {operationHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        用户
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        原因
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        时间
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {operationHistory.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {record.users?.username || '未知用户'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {record.users?.email || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            record.amount > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.amount > 0 ? '+' : ''}{record.amount.toLocaleString()} 积分
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {record.description}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(record.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                暂无操作记录
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
