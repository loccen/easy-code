'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/layout';
import { Button, Card, Badge } from '@/components/ui';
import { getProjectById, incrementProjectViews, getSellerProjects } from '@/lib/projects';
import { useAuth } from '@/stores/authStore';
import { useDialogContext } from '@/components/DialogProvider';
import { Project } from '@/types';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { alert } = useDialogContext();
  const [project, setProject] = useState<Project | null>(null);
  const [sellerProjects, setSellerProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectId = params.id as string;

  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 管理员可以查看所有状态的项目，普通用户只能查看已发布的项目
      const checkStatus = !user?.role || user.role !== 'admin';
      const projectData = await getProjectById(projectId, checkStatus);
      
      if (!projectData) {
        setError('项目不存在或已下架');
        return;
      }

      setProject(projectData);
      
      // 增加浏览量
      await incrementProjectViews(projectId);
      
      // 加载卖家的其他项目
      if (projectData.seller_id) {
        try {
          const otherProjects = await getSellerProjects(projectData.seller_id);
          setSellerProjects(otherProjects.filter(p => p.id !== projectId).slice(0, 4));
        } catch (err) {
          console.error('加载卖家其他项目失败:', err);
        }
      }
    } catch (err) {
      console.error('加载项目详情失败:', err);
      setError('加载项目详情失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId, loadProject]);

  const formatPrice = (price: number, currency: string = 'CNY') => {
    if (currency === 'CNY') {
      return `¥${price}`;
    }
    return `$${price}`;
  };

  const handlePurchase = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    // TODO: 实现购买逻辑
    await alert({
      type: 'info',
      message: '购买功能正在开发中...'
    });
  };

  const handleAddToCart = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    // TODO: 实现加入购物车逻辑
    await alert({
      type: 'info',
      message: '购物车功能正在开发中...'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !project) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="p-12 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">项目不存在</h2>
            <p className="text-gray-600 mb-4">{error || '您访问的项目不存在或已下架'}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.back()}>返回上页</Button>
              <Link href="/projects">
                <Button variant="outline">浏览项目</Button>
              </Link>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* 面包屑导航 */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-blue-600">首页</Link>
          <span>/</span>
          <Link href="/projects" className="hover:text-blue-600">项目市场</Link>
          <span>/</span>
          {(project as Project & { category?: { name: string; slug: string } }).category && (
            <>
              <Link href={`/projects?category=${(project as Project & { category?: { name: string; slug: string } }).category?.slug}`} className="hover:text-blue-600">
                {(project as Project & { category?: { name: string; slug: string } }).category?.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-900">{project.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧内容 */}
          <div className="lg:col-span-2">
            {/* 项目图片 */}
            <Card className="overflow-hidden mb-6">
              <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                {(project as Project & { thumbnail_url?: string }).thumbnail_url ? (
                  <img
                    src={(project as Project & { thumbnail_url?: string }).thumbnail_url}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p>暂无项目图片</p>
                  </div>
                )}
              </div>
            </Card>

            {/* 项目信息 */}
            <Card className="p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.title}</h1>
                  {project.short_description && (
                    <p className="text-gray-600 mb-4">{project.short_description}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {formatPrice(project.price, project.currency)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>👁 {project.view_count || 0}</span>
                    <span>⭐ {project.rating_average || 0}</span>
                    <span>📥 {project.download_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* 技术栈 */}
              {project.tech_stack && project.tech_stack.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">技术栈</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.tech_stack.map((tech, index) => (
                      <Badge key={index} variant="outline">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 项目链接 */}
              <div className="flex flex-wrap gap-4 mb-4">
                {project.demo_url && (
                  <a
                    href={project.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    🔗 在线演示
                  </a>
                )}
                {project.github_url && (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    📦 GitHub
                  </a>
                )}
                {project.documentation_url && (
                  <a
                    href={project.documentation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    📚 文档
                  </a>
                )}
              </div>

              {/* 特性标签 */}
              <div className="flex flex-wrap gap-2">
                {project.is_dockerized && (
                  <Badge variant="success">🐳 Docker化</Badge>
                )}
                {project.featured && (
                  <Badge variant="primary">⭐ 精选项目</Badge>
                )}
              </div>
            </Card>

            {/* 项目描述 */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">项目描述</h2>
              <div className="prose max-w-none text-gray-600">
                {project.description.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </Card>
          </div>

          {/* 右侧边栏 */}
          <div className="lg:col-span-1">
            {/* 购买区域 */}
            <Card className="p-6 mb-6 sticky top-4">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {formatPrice(project.price, project.currency)}
                </div>
                <p className="text-sm text-gray-600">一次购买，永久使用</p>
              </div>

              <div className="space-y-3">
                <Button onClick={handlePurchase} className="w-full" size="lg">
                  立即购买
                </Button>
                <Button onClick={handleAddToCart} variant="outline" className="w-full">
                  加入购物车
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3">包含内容</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    完整源代码
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    部署说明文档
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    技术支持
                  </li>
                  {project.is_dockerized && (
                    <li className="flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Docker 配置文件
                    </li>
                  )}
                </ul>
              </div>
            </Card>

            {/* 卖家信息 */}
            <Card className="p-6 mb-6">
              <h3 className="font-medium text-gray-900 mb-4">卖家信息</h3>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                  <span className="text-lg text-gray-600">
                    {project.seller?.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {project.seller?.username || '匿名用户'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {project.seller?.email || ''}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">项目数量</span>
                  <span className="font-medium">{sellerProjects.length + 1}个</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">加入时间</span>
                  <span className="font-medium">
                    {project.seller?.created_at ? new Date(project.seller.created_at).getFullYear() : '未知'}
                  </span>
                </div>
              </div>
              
              {sellerProjects.length > 0 && (
                <Button variant="outline" className="w-full mt-4">
                  查看更多项目
                </Button>
              )}
            </Card>

            {/* 卖家其他项目 */}
            {sellerProjects.length > 0 && (
              <Card className="p-6">
                <h3 className="font-medium text-gray-900 mb-4">卖家其他项目</h3>
                <div className="space-y-3">
                  {sellerProjects.map((otherProject) => (
                    <Link key={otherProject.id} href={`/projects/${otherProject.id}`}>
                      <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded flex items-center justify-center mr-3">
                          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {otherProject.title}
                          </div>
                          <div className="text-sm text-blue-600">
                            {formatPrice(otherProject.price, otherProject.currency)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
