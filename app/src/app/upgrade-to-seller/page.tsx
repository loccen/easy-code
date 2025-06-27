'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout';
import { Button, Card, Input, Loading } from '@/components/ui';
import { useAuth } from '@/stores/authStore';
import { createRoleUpgradeRequest, hasPendingUpgradeRequest, getUserRoleUpgradeRequests } from '@/lib/roleUpgrade';
import { RoleUpgradeRequest } from '@/types';

export default function UpgradeToSellerPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasPending, setHasPending] = useState(false);
  const [existingRequests, setExistingRequests] = useState<RoleUpgradeRequest[]>([]);
  const [formData, setFormData] = useState({
    reason: '',
    experience: '',
    portfolio_url: '',
    github_url: '',
  });

  useEffect(() => {
    if (user && !authLoading) {
      checkExistingRequests();
    }
  }, [user, authLoading]);

  const checkExistingRequests = async () => {
    try {
      setLoading(true);
      
      // 检查是否有待审核的申请
      const pending = await hasPendingUpgradeRequest('seller');
      setHasPending(pending);
      
      // 获取所有申请记录
      const requests = await getUserRoleUpgradeRequests();
      setExistingRequests(requests);
    } catch (err) {
      console.error('检查申请状态失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await createRoleUpgradeRequest({
        to_role: 'seller',
        reason: formData.reason,
        experience: formData.experience || undefined,
        portfolio_url: formData.portfolio_url || undefined,
        github_url: formData.github_url || undefined,
      });

      setSuccess('申请提交成功！我们会在3-5个工作日内审核您的申请。');
      setFormData({
        reason: '',
        experience: '',
        portfolio_url: '',
        github_url: '',
      });
      
      // 重新检查申请状态
      await checkExistingRequests();
    } catch (err) {
      console.error('提交申请失败:', err);
      setError(err instanceof Error ? err.message : '提交申请失败');
    } finally {
      setLoading(false);
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

  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center">
            <Loading />
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  // 管理员拥有最高权限，不需要升级
  if (isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <div className="text-purple-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">您已拥有最高权限</h1>
            <p className="text-gray-600 mb-6">作为管理员，您已经拥有包括卖家在内的所有权限，无需申请升级。</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push('/seller/upload')}>
                上传项目
              </Button>
              <Button variant="outline" onClick={() => router.push('/admin/categories')}>
                管理员后台
              </Button>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  // 卖家已经拥有卖家权限
  if (user?.role === 'seller') {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <div className="text-green-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">您已经是卖家了！</h1>
            <p className="text-gray-600 mb-6">您现在可以上传和管理您的项目了。</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push('/seller/upload')}>
                上传项目
              </Button>
              <Button variant="outline" onClick={() => router.push('/seller/projects')}>
                管理项目
              </Button>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">申请成为卖家</h1>
            <p className="text-gray-600">
              成为卖家后，您可以在平台上销售您的源码项目，获得收益并分享您的技术成果。
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左侧：申请表单 */}
            <div className="lg:col-span-2">
              {hasPending ? (
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-yellow-600 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">申请审核中</h2>
                    <p className="text-gray-600 mb-4">
                      您的卖家申请正在审核中，我们会在3-5个工作日内给出审核结果。
                    </p>
                    <p className="text-sm text-gray-500">
                      如有疑问，请联系客服。
                    </p>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">申请信息</h2>
                  
                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-600">{error}</p>
                    </div>
                  )}
                  
                  {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-green-600">{success}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 申请理由 */}
                    <div>
                      <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                        申请理由 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="reason"
                        name="reason"
                        value={formData.reason}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请详细说明您为什么想成为卖家，以及您能为平台带来什么价值..."
                        required
                      />
                    </div>

                    {/* 开发经验 */}
                    <div>
                      <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                        开发经验
                      </label>
                      <textarea
                        id="experience"
                        name="experience"
                        value={formData.experience}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请简要介绍您的开发经验、技术栈、项目经历等..."
                      />
                    </div>

                    {/* 作品集链接 */}
                    <div>
                      <label htmlFor="portfolio_url" className="block text-sm font-medium text-gray-700 mb-2">
                        作品集链接
                      </label>
                      <Input
                        id="portfolio_url"
                        name="portfolio_url"
                        type="url"
                        value={formData.portfolio_url}
                        onChange={handleInputChange}
                        placeholder="https://your-portfolio.com"
                      />
                    </div>

                    {/* GitHub链接 */}
                    <div>
                      <label htmlFor="github_url" className="block text-sm font-medium text-gray-700 mb-2">
                        GitHub链接
                      </label>
                      <Input
                        id="github_url"
                        name="github_url"
                        type="url"
                        value={formData.github_url}
                        onChange={handleInputChange}
                        placeholder="https://github.com/yourusername"
                      />
                    </div>

                    {/* 提交按钮 */}
                    <div className="flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                      >
                        取消
                      </Button>
                      <Button
                        type="submit"
                        loading={loading}
                        disabled={loading}
                      >
                        提交申请
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
            </div>

            {/* 右侧：说明和申请历史 */}
            <div className="lg:col-span-1">
              {/* 卖家权益说明 */}
              <Card className="p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">卖家权益</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    上传和销售源码项目
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    获得销售收益和积分
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    项目管理和数据统计
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Docker化项目双倍积分
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    平台技术支持
                  </li>
                </ul>
              </Card>

              {/* 申请历史 */}
              {existingRequests.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">申请历史</h3>
                  <div className="space-y-3">
                    {existingRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusText(request.status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {request.admin_comment && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">审核意见：</span>
                            {request.admin_comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
