'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { Button, Card, Badge, Loading, Input } from '@/components/ui';
import { useAuth } from '@/stores/authStore';
import { 
  getAllRoleUpgradeRequests, 
  reviewRoleUpgradeRequest, 
  getRoleUpgradeStats 
} from '@/lib/roleUpgrade';
import { RoleUpgradeRequest } from '@/types';

export default function AdminRoleUpgradesPage() {
  const { user, isAdmin } = useAuth();
  const [requests, setRequests] = useState<RoleUpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    if (isAdmin) {
      loadRequests();
      loadStats();
    }
  }, [isAdmin, selectedStatus]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = selectedStatus === 'all' 
        ? await getAllRoleUpgradeRequests()
        : await getAllRoleUpgradeRequests(selectedStatus);
      
      setRequests(data);
    } catch (err) {
      console.error('加载申请列表失败:', err);
      setError('加载申请列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getRoleUpgradeStats();
      setStats(data);
    } catch (err) {
      console.error('加载统计数据失败:', err);
    }
  };

  const handleReview = async (requestId: string, action: 'approved' | 'rejected') => {
    try {
      setReviewingId(requestId);
      
      await reviewRoleUpgradeRequest(requestId, action, reviewComment);
      
      // 重新加载数据
      await loadRequests();
      await loadStats();
      
      // 清空评论
      setReviewComment('');
      setReviewingId(null);
    } catch (err) {
      console.error('审核失败:', err);
      setError(err instanceof Error ? err.message : '审核失败');
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getRoleText = (role: string) => {
    const roleMap: Record<string, string> = {
      buyer: '买家',
      seller: '卖家',
      admin: '管理员',
    };
    return roleMap[role] || role;
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">访问被拒绝</h1>
            <p className="text-gray-600">您没有权限访问此页面。</p>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">角色升级管理</h1>
          <p className="text-gray-600">管理用户的角色升级申请</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总申请数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">待审核</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">已通过</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">已拒绝</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* 筛选器 */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">状态筛选:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">全部</option>
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
            </select>
          </div>
        </Card>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* 申请列表 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loading />
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无申请</h3>
              <p className="text-gray-500">
                {selectedStatus === 'all' ? '还没有角色升级申请' : `没有${getStatusText(selectedStatus)}的申请`}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {requests.map((request) => (
              <Card key={request.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.user?.username || '未知用户'}
                      </h3>
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusText(request.status)}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {getRoleText(request.from_role)} → {getRoleText(request.to_role)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      邮箱: {request.user?.email || '未知'}
                    </p>
                    <p className="text-sm text-gray-500">
                      申请时间: {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {request.reviewed_at && (
                      <p className="text-sm text-gray-500">
                        审核时间: {new Date(request.reviewed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* 申请详情 */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">申请理由</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      {request.reason}
                    </p>
                  </div>

                  {request.experience && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">开发经验</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                        {request.experience}
                      </p>
                    </div>
                  )}

                  {(request.portfolio_url || request.github_url) && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">相关链接</h4>
                      <div className="flex gap-4">
                        {request.portfolio_url && (
                          <a
                            href={request.portfolio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            🔗 作品集
                          </a>
                        )}
                        {request.github_url && (
                          <a
                            href={request.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            📦 GitHub
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {request.admin_comment && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">审核意见</h4>
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                        {request.admin_comment}
                      </p>
                    </div>
                  )}
                </div>

                {/* 审核操作 */}
                {request.status === 'pending' && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        审核意见
                      </label>
                      <textarea
                        value={reviewingId === request.id ? reviewComment : ''}
                        onChange={(e) => {
                          if (reviewingId === request.id) {
                            setReviewComment(e.target.value);
                          }
                        }}
                        onFocus={() => setReviewingId(request.id)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入审核意见（可选）..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleReview(request.id, 'approved')}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={reviewingId !== null && reviewingId !== request.id}
                      >
                        通过
                      </Button>
                      <Button
                        onClick={() => handleReview(request.id, 'rejected')}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        disabled={reviewingId !== null && reviewingId !== request.id}
                      >
                        拒绝
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
