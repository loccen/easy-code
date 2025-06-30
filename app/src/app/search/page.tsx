'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Layout } from '@/components/layout';
import { Button, Card, CardContent, Badge, Input } from '@/components/ui';
import { searchProjects } from '@/lib/projects';
import { getActiveCategories } from '@/lib/categories';
import { Project, Category } from '@/types';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // 搜索条件
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [selectedTechStack, setSelectedTechStack] = useState<string[]>([]);
  const [customTech, setCustomTech] = useState('');

  const itemsPerPage = 12;

  // 常用技术栈选项
  const popularTechStack = [
    'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Next.js',
    'TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'PHP',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes'
  ];

  const performSearch = useCallback(async (page: number = 1, query?: string, category?: string) => {
    try {
      setLoading(true);
      setError(null);

      const searchTerm = query !== undefined ? query : searchQuery;
      const categoryFilter = category !== undefined ? category : selectedCategory;
      const offset = (page - 1) * itemsPerPage;

      const result = await searchProjects(searchTerm, {
        categoryId: categoryFilter || undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        techStack: selectedTechStack.length > 0 ? selectedTechStack : undefined,
        limit: itemsPerPage,
        offset,
      });

      setProjects(result.projects);
      setTotal(result.total);
      setCurrentPage(page);
    } catch (err) {
      console.error('搜索失败:', err);
      setError('搜索失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, minPrice, maxPrice, selectedTechStack, itemsPerPage]);

  useEffect(() => {
    loadCategories();

    // 从URL参数获取初始搜索条件
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';

    setSearchQuery(query);
    setSelectedCategory(category);

    if (query || category) {
      performSearch(1, query, category);
    }
  }, [searchParams, performSearch]);

  const loadCategories = async () => {
    try {
      const data = await getActiveCategories();
      setCategories(data);
    } catch (err) {
      console.error('加载分类失败:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(1);
  };

  const handleTechStackToggle = (tech: string) => {
    setSelectedTechStack(prev => 
      prev.includes(tech) 
        ? prev.filter(t => t !== tech)
        : [...prev, tech]
    );
  };

  const handleAddCustomTech = () => {
    if (customTech.trim() && !selectedTechStack.includes(customTech.trim())) {
      setSelectedTechStack(prev => [...prev, customTech.trim()]);
      setCustomTech('');
    }
  };

  const handleRemoveTech = (tech: string) => {
    setSelectedTechStack(prev => prev.filter(t => t !== tech));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedTechStack([]);
    setCustomTech('');
    setProjects([]);
    setTotal(0);
    setCurrentPage(1);
  };



  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">高级搜索</h1>
          <p className="text-gray-600">使用更多筛选条件找到您需要的项目</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧筛选器 */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">筛选条件</h2>
              
              <form onSubmit={handleSearch} className="space-y-6">
                {/* 关键词搜索 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    关键词
                  </label>
                  <Input
                    type="text"
                    placeholder="搜索项目名称、描述..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* 分类筛选 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分类
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">全部分类</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 价格范围 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    价格范围（积分）
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="最低积分"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      min="0"
                    />
                    <Input
                      type="number"
                      placeholder="最高积分"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                {/* 技术栈筛选 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    技术栈
                  </label>
                  
                  {/* 已选择的技术栈 */}
                  {selectedTechStack.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedTechStack.map((tech) => (
                          <Badge
                            key={tech}
                            variant="primary"
                            className="cursor-pointer"
                            onClick={() => handleRemoveTech(tech)}
                          >
                            {tech} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 常用技术栈选择 */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {popularTechStack.map((tech) => (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => handleTechStackToggle(tech)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          selectedTechStack.includes(tech)
                            ? 'bg-blue-100 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {tech}
                      </button>
                    ))}
                  </div>

                  {/* 自定义技术栈 */}
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="自定义技术栈"
                      value={customTech}
                      onChange={(e) => setCustomTech(e.target.value)}
                      className="flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomTech();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleAddCustomTech}
                      size="sm"
                      variant="outline"
                    >
                      添加
                    </Button>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="space-y-2">
                  <Button type="submit" className="w-full">
                    搜索
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    清空筛选
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* 右侧搜索结果 */}
          <div className="lg:col-span-3">
            {/* 搜索结果统计 */}
            {!loading && total > 0 && (
              <div className="mb-6">
                <p className="text-gray-600">
                  共找到 <span className="font-semibold">{total}</span> 个项目
                  {searchQuery && (
                    <span> 关于 &ldquo;<span className="font-semibold">{searchQuery}</span>&rdquo;</span>
                  )}
                </p>
              </div>
            )}

            {/* 加载状态 */}
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">搜索中...</p>
              </div>
            )}

            {/* 错误状态 */}
            {error && (
              <Card className="p-6 text-center">
                <p className="text-red-600">{error}</p>
                <Button onClick={() => performSearch(currentPage)} className="mt-4">
                  重试
                </Button>
              </Card>
            )}

            {/* 搜索结果 */}
            {!loading && !error && (
              <>
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
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">没有找到匹配的项目</h3>
                      <p className="text-gray-500 mb-4">
                        尝试调整搜索条件或浏览所有项目
                      </p>
                      <Link href="/projects">
                        <Button>浏览所有项目</Button>
                      </Link>
                    </div>
                  </Card>
                ) : (
                  <>
                    {/* 项目网格 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
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
                            onClick={() => performSearch(currentPage - 1)}
                          >
                            上一页
                          </Button>
                          
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const page = i + 1;
                            return (
                              <Button
                                key={page}
                                variant={currentPage === page ? 'primary' : 'outline'}
                                onClick={() => performSearch(page)}
                              >
                                {page}
                              </Button>
                            );
                          })}
                          
                          <Button
                            variant="outline"
                            disabled={currentPage === totalPages}
                            onClick={() => performSearch(currentPage + 1)}
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
        </div>
      </div>
    </Layout>
  );
}

// 项目卡片组件
function ProjectCard({ project }: { project: Project }) {
  const formatPrice = (price: number) => {
    return `${price.toLocaleString()} 积分`;
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
                {formatPrice(project.price)}
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
                    {(project as Project & { seller?: { username: string } }).seller?.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="text-sm text-gray-600">
                  {(project as Project & { seller?: { username: string } }).seller?.username || '匿名用户'}
                </span>
              </div>
            </div>
          </CardContent>
        </div>
      </Link>
    </Card>
  );
}

export default function SearchPage() {
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
      <SearchPageContent />
    </Suspense>
  );
}
