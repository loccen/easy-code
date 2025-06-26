'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Button, Card, Loading } from '@/components/ui';
import { Project } from '@/types';

export default function SellerProjectsPage() {
  const { user, loading: authLoading, isSeller } = useAuth();
  const router = useRouter();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 权限检查
  useEffect(() => {
    if (!authLoading && (!user || !isSeller)) {
      router.push('/dashboard');
    }
  }, [authLoading, user, isSeller, router]);

  // 加载项目数据
  useEffect(() => {
    if (user && isSeller) {
      loadProjects();
    }
  }, [user, isSeller]);

  const loadProjects = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          category:categories(name, slug)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
    } catch (err) {
      console.error('加载项目失败:', err);
      setError('加载项目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    try {
      setError('');
      
      const { error } = await supabase
        .from('projects')
        .update({
          status: newStatus,
          published_at: newStatus === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', projectId);

      if (error) throw error;

      setSuccess(`项目状态已更新为${getStatusText(newStatus)}！`);
      await loadProjects();
    } catch (err) {
      console.error('更新项目状态失败:', err);
      setError(err instanceof Error ? err.message : '更新项目状态失败');
    }
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`确定要删除项目"${project.title}"吗？此操作不可撤销。`)) {
      return;
    }

    try {
      setError('');
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      setSuccess('项目删除成功！');
      await loadProjects();
    } catch (err) {
      console.error('删除项目失败:', err);
      setError(err instanceof Error ? err.message : '删除项目失败');
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      pending_review: '待审核',
      approved: '已发布',
      rejected: '已拒绝',
      archived: '已归档',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      archived: 'bg-orange-100 text-orange-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const formatPrice = (price: number, currency: string = 'CNY') => {
    const currencySymbols: Record<string, string> = {
      CNY: '¥',
      USD: '$',
      EUR: '€',
    };
    return `${currencySymbols[currency] || currency} ${price.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!user || !isSeller) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">我的项目</h1>
            <p className="mt-2 text-gray-600">管理您发布的源码项目</p>
          </div>
          <Link href="/seller/upload">
            <Button>上传新项目</Button>
          </Link>
        </div>

        {/* 错误和成功消息 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        {/* 项目列表 */}
        {projects.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-gray-500">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无项目</h3>
              <p className="mt-1 text-sm text-gray-500">
                开始上传您的第一个项目吧
              </p>
              <div className="mt-6">
                <Link href="/seller/upload">
                  <Button>上传项目</Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {projects.map((project) => (
              <Card key={project.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {project.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {getStatusText(project.status)}
                      </span>
                      {project.featured && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          精选
                        </span>
                      )}
                    </div>
                    
                    {project.short_description && (
                      <p className="text-gray-600 mb-3">{project.short_description}</p>
                    )}
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                      <span>价格: {formatPrice(project.price, project.currency)}</span>
                      {(project as any).category && (
                        <span>分类: {(project as any).category.name}</span>
                      )}
                      <span>下载: {project.download_count || 0}</span>
                      <span>浏览: {project.view_count || 0}</span>
                      <span>创建: {formatDate(project.created_at)}</span>
                    </div>
                    
                    {project.tech_stack && project.tech_stack.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.tech_stack.map((tech, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {/* 状态操作按钮 */}
                    {project.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(project.id, 'pending_review')}
                      >
                        提交审核
                      </Button>
                    )}

                    {project.status === 'approved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(project.id, 'draft')}
                      >
                        下架
                      </Button>
                    )}

                    {project.status === 'rejected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(project.id, 'pending_review')}
                      >
                        重新提交
                      </Button>
                    )}
                    
                    <Link href={`/seller/projects/${project.id}/edit`}>
                      <Button variant="outline" size="sm">
                        编辑
                      </Button>
                    </Link>
                    
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(project)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
                
                {/* 项目链接 */}
                {(project.demo_url || project.github_url || project.documentation_url) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex space-x-4 text-sm">
                      {project.demo_url && (
                        <a
                          href={project.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          演示地址
                        </a>
                      )}
                      {project.github_url && (
                        <a
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          GitHub
                        </a>
                      )}
                      {project.documentation_url && (
                        <a
                          href={project.documentation_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          文档
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
