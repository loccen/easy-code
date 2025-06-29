'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/layout';
import { Button, Card, Badge, Loading, Input } from '@/components/ui';
import { useAuth } from '@/stores/authStore';
import { useDialogContext } from '@/components/DialogProvider';
import {
  getAllProjectsForAdmin,
  getProjectStatsForAdmin,
  updateProjectStatusAsAdmin,
  deleteProjectAsAdmin
} from '@/lib/projects';
import { getAllCategories } from '@/lib/categories';
import { Project, Category } from '@/types';

export default function AdminProjectsPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { confirm, alert } = useDialogContext();
  const router = useRouter();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 筛选和搜索状态
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const itemsPerPage = 20;
  
  // 统计信息
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending_review: 0,
    approved: 0,
    rejected: 0,
    archived: 0,
  });
  
  // 审核状态
  const [reviewingProject, setReviewingProject] = useState<Project | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');

  // 权限检查
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [authLoading, user, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      loadProjects();
      loadCategories();
      loadStats();
    }
  }, [isAdmin, selectedStatus, selectedCategory, searchQuery, currentPage]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      
      const offset = (currentPage - 1) * itemsPerPage;
      const result = await getAllProjectsForAdmin({
        status: selectedStatus,
        categoryId: selectedCategory || undefined,
        search: searchQuery || undefined,
        limit: itemsPerPage,
        offset,
        sortBy: 'updated_at',
        sortOrder: 'desc',
      });
      
      setProjects(result.projects);
      setTotalProjects(result.total);
    } catch (err) {
      console.error('加载项目列表失败:', err);
      setError('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getAllCategories();
      setCategories(data);
    } catch (err) {
      console.error('加载分类失败:', err);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getProjectStatsForAdmin();
      setStats(data);
    } catch (err) {
      console.error('加载统计数据失败:', err);
    }
  };

  const handleStatusChange = async (project: Project, newStatus: string) => {
    try {
      setError('');
      
      await updateProjectStatusAsAdmin(project.id, newStatus);
      
      setSuccess(`项目"${project.title}"状态已更新为${getStatusText(newStatus)}！`);
      await loadProjects();
      await loadStats();
    } catch (err) {
      console.error('更新项目状态失败:', err);
      setError(err instanceof Error ? err.message : '更新项目状态失败');
    }
  };

  const handleReview = async () => {
    if (!reviewingProject) return;
    
    try {
      setError('');
      
      await updateProjectStatusAsAdmin(
        reviewingProject.id, 
        reviewAction, 
        reviewComment
      );
      
      setSuccess(`项目"${reviewingProject.title}"已${reviewAction === 'approved' ? '批准' : '拒绝'}！`);
      setReviewingProject(null);
      setReviewComment('');
      await loadProjects();
      await loadStats();
    } catch (err) {
      console.error('审核项目失败:', err);
      setError(err instanceof Error ? err.message : '审核项目失败');
    }
  };

  const handleDelete = async (project: Project) => {
    const confirmed = await confirm({
      title: '删除项目',
      message: `确定要删除项目"${project.title}"吗？\n\n此操作不可撤销。`,
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      setError('');

      await deleteProjectAsAdmin(project.id);

      await alert({
        type: 'success',
        message: `项目"${project.title}"已删除！`
      });

      await loadProjects();
      await loadStats();
    } catch (err) {
      console.error('删除项目失败:', err);
      await alert({
        type: 'error',
        message: err instanceof Error ? err.message : '删除项目失败'
      });
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
      archived: 'bg-purple-100 text-purple-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const formatPrice = (price: number, currency: string = 'CNY') => {
    if (currency === 'CNY') {
      return `¥${price}`;
    }
    return `$${price}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loading />
        </div>
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const totalPages = Math.ceil(totalProjects / itemsPerPage);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
          <p className="mt-2 text-gray-600">管理平台上的所有项目</p>
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

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">总项目</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
            <div className="text-sm text-gray-600">草稿</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending_review}</div>
            <div className="text-sm text-gray-600">待审核</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-600">已发布</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600">已拒绝</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.archived}</div>
            <div className="text-sm text-gray-600">已归档</div>
          </Card>
        </div>

        {/* 筛选和搜索 */}
        <Card className="p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 状态筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                状态筛选
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全部状态</option>
                <option value="draft">草稿</option>
                <option value="pending_review">待审核</option>
                <option value="approved">已发布</option>
                <option value="rejected">已拒绝</option>
                <option value="archived">已归档</option>
              </select>
            </div>

            {/* 分类筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类筛选
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">全部分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 搜索 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                搜索项目
              </label>
              <Input
                type="text"
                placeholder="搜索项目标题或描述..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full"
              />
            </div>
          </div>
        </Card>

        {/* 项目列表 */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    项目信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    卖家
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    分类
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    价格
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    统计
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {project.title}
                        </div>
                        {project.short_description && (
                          <div className="text-sm text-gray-500 truncate">
                            {project.short_description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {project.seller?.username || '未知'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {project.seller?.email || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {project.category?.name || '未分类'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(project.price, project.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusColor(project.status)}>
                        {getStatusText(project.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>👁 {project.view_count || 0}</div>
                      <div>📥 {project.download_count || 0}</div>
                      <div>⭐ {project.rating_average || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>创建: {formatDate(project.created_at)}</div>
                      <div>更新: {formatDate(project.updated_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col space-y-2">
                        <Link href={`/projects/${project.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            查看
                          </Button>
                        </Link>

                        {project.status === 'pending_review' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setReviewingProject(project);
                              setReviewAction('approved');
                            }}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            审核
                          </Button>
                        )}

                        {project.status === 'approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(project, 'archived')}
                            className="w-full"
                          >
                            下架
                          </Button>
                        )}

                        {project.status === 'rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(project, 'pending_review')}
                            className="w-full"
                          >
                            重审
                          </Button>
                        )}

                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(project)}
                          className="w-full"
                        >
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {projects.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-500">暂无项目数据</div>
            </div>
          )}
        </Card>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </Button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}

              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
            </div>
          </div>
        )}

        {/* 审核对话框 */}
        {reviewingProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                审核项目: {reviewingProject.title}
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  审核结果
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="reviewAction"
                      value="approved"
                      checked={reviewAction === 'approved'}
                      onChange={(e) => setReviewAction(e.target.value as 'approved' | 'rejected')}
                      className="mr-2"
                    />
                    批准发布
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="reviewAction"
                      value="rejected"
                      checked={reviewAction === 'rejected'}
                      onChange={(e) => setReviewAction(e.target.value as 'approved' | 'rejected')}
                      className="mr-2"
                    />
                    拒绝发布
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  审核意见（可选）
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入审核意见..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReviewingProject(null);
                    setReviewComment('');
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={handleReview}
                  className={reviewAction === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  确认{reviewAction === 'approved' ? '批准' : '拒绝'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
