'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Layout } from '@/components/layout';
import { Button, Card, CardContent, Badge, Input } from '@/components/ui';
import { getPublishedProjects, searchProjects } from '@/lib/projects';
import { getActiveCategories } from '@/lib/categories';
import { Project, Category } from '@/types';
import { getUserDisplayName, getUserAvatarLetter } from '@/lib/auth';

function ProjectsPageContent() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'created_at' | 'price' | 'rating_average' | 'download_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const itemsPerPage = 12;

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getActiveCategories();
      setCategories(data);
    } catch (err) {
      console.error('加载分类失败:', err);
    }
  };

  const loadProjects = useCallback(async (page: number = 1, categoryFilter?: string, searchFilter?: string) => {
    try {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * itemsPerPage;
      const category = categoryFilter !== undefined ? categoryFilter : selectedCategory;
      const search = searchFilter !== undefined ? searchFilter : searchQuery;

      let result;
      if (search.trim()) {
        // 使用搜索功能
        result = await searchProjects(search, {
          categoryId: category || undefined,
          limit: itemsPerPage,
          offset,
        });
      } else {
        // 使用普通列表功能
        result = await getPublishedProjects({
          categoryId: category || undefined,
          limit: itemsPerPage,
          offset,
          sortBy,
          sortOrder,
        });
      }

      setProjects(result.projects);
      setTotal(result.total);
      setCurrentPage(page);
    } catch (err) {
      console.error('加载项目失败:', err);
      setError('加载项目失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    // 从URL参数获取初始值
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';

    setSelectedCategory(category);
    setSearchQuery(search);

    loadProjects(1, category, search);
  }, [searchParams, loadProjects]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProjects(1);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
    loadProjects(1, categoryId);
  };

  const handleSortChange = (newSortBy: typeof sortBy, newSortOrder: typeof sortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    loadProjects(currentPage);
  };

  // const formatPrice = (price: number, currency: string = 'CNY') => {
  //   if (currency === 'CNY') {
  //     return `¥${price}`;
  //   }
  //   return `$${price}`;
  // };

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">项目市场</h1>
          <p className="text-gray-600">发现优质的源码项目，加速您的开发进程</p>
        </div>

        {/* 搜索和筛选 */}
        <Card className="p-6 mb-8">
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="搜索项目名称、描述、技术栈..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button type="submit">搜索</Button>
            </div>
          </form>

          <div className="flex flex-wrap gap-4 items-center">
            {/* 分类筛选 */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">分类:</label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="">全部分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 排序 */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">排序:</label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                  handleSortChange(newSortBy, newSortOrder);
                }}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="created_at-desc">最新发布</option>
                <option value="created_at-asc">最早发布</option>
                <option value="price-asc">价格从低到高</option>
                <option value="price-desc">价格从高到低</option>
                <option value="rating_average-desc">评分最高</option>
                <option value="download_count-desc">下载最多</option>
              </select>
            </div>
          </div>
        </Card>

        {/* 加载状态 */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <Card className="p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Button onClick={() => loadProjects(currentPage)} className="mt-4">
              重试
            </Button>
          </Card>
        )}

        {/* 项目列表 */}
        {!loading && !error && (
          <>
            {/* 结果统计 */}
            <div className="mb-6">
              <p className="text-gray-600">
                共找到 <span className="font-semibold">{total}</span> 个项目
              </p>
            </div>

            {projects.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="text-gray-500">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无项目</h3>
                  <p className="text-gray-500">
                    {searchQuery || selectedCategory ? '没有找到符合条件的项目' : '还没有发布的项目'}
                  </p>
                </div>
              </Card>
            ) : (
              <>
                {/* 项目网格 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                  {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>

                {/* 分页 */}
                {totalPages > 1 && (
                  <div className="flex justify-center">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={currentPage === 1}
                        onClick={() => loadProjects(currentPage - 1)}
                      >
                        上一页
                      </Button>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'primary' : 'outline'}
                            onClick={() => loadProjects(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                      
                      <Button
                        variant="outline"
                        disabled={currentPage === totalPages}
                        onClick={() => loadProjects(currentPage + 1)}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

// 项目卡片组件
function ProjectCard({ project }: { project: Project }) {
  const formatPrice = (price: number, currency: string = 'CNY') => {
    if (currency === 'CNY') {
      return `¥${price}`;
    }
    return `$${price}`;
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/projects/${project.id}`}>
        <div className="cursor-pointer">
          {/* 项目图片 */}
          <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative">
            {(project as Project & { thumbnail_url?: string }).thumbnail_url ? (
              <Image
                src={(project as Project & { thumbnail_url?: string }).thumbnail_url!}
                alt={project.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm">暂无图片</p>
              </div>
            )}
          </div>

          <CardContent className="p-4">
            {/* 项目标题 */}
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
              {project.title}
            </h3>

            {/* 项目简介 */}
            {project.short_description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {project.short_description}
              </p>
            )}

            {/* 技术栈 */}
            {project.tech_stack && project.tech_stack.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {project.tech_stack.slice(0, 3).map((tech, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tech}
                  </Badge>
                ))}
                {project.tech_stack.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{project.tech_stack.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* 价格和统计 */}
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-blue-600">
                {formatPrice(project.price, project.currency)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>👁 {project.view_count || 0}</span>
                <span>⭐ {project.rating_average || 0}</span>
              </div>
            </div>

            {/* 卖家信息 */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs text-gray-600">
                    {getUserAvatarLetter((project as Project & { seller?: any }).seller)}
                  </span>
                </div>
                <span className="text-sm text-gray-600">
                  {getUserDisplayName((project as Project & { seller?: any }).seller)}
                </span>
              </div>
            </div>
          </CardContent>
        </div>
      </Link>
    </Card>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </Layout>
    }>
      <ProjectsPageContent />
    </Suspense>
  );
}
