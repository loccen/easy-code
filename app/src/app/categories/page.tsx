'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/layout';
import { Card, Loading } from '@/components/ui';
import { apiClient } from '@/lib/api/fetch-client';
import { Category } from '@/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);

      const result = await apiClient.get('/categories');

      if (!result.success) {
        throw new Error(result.error?.message || '加载分类失败');
      }

      setCategories(result.data || []);
    } catch (err) {
      console.error('加载分类失败:', err);
      setError(err instanceof Error ? err.message : '加载分类失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loading />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">加载失败</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </Layout>
    );
  }

  // 组织分类数据为层级结构
  const topLevelCategories = categories.filter(cat => !cat.parent_id);
  const getSubCategories = (parentId: string) => 
    categories.filter(cat => cat.parent_id === parentId);

  return (
    <Layout>
        {/* 页面标题 */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">项目分类</h1>
          <p className="mt-2 text-gray-600">浏览不同类型的源码项目</p>
        </div>

        {/* 分类网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topLevelCategories.map((category) => {
            const subCategories = getSubCategories(category.id);
            
            return (
              <Card key={category.id} className="p-6 hover:shadow-lg transition-shadow">
                <Link href={`/projects?category=${category.slug}`}>
                  <div className="cursor-pointer">
                    {/* 分类图标和名称 */}
                    <div className="flex items-center mb-4">
                      {category.icon && (
                        <span className="text-3xl mr-3">{category.icon}</span>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {category.name}
                        </h3>
                        {category.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                {/* 子分类 */}
                {subCategories.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">子分类</h4>
                    <div className="flex flex-wrap gap-2">
                      {subCategories.map((subCategory) => (
                        <Link
                          key={subCategory.id}
                          href={`/projects?category=${subCategory.slug}`}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          {subCategory.icon && (
                            <span className="mr-1">{subCategory.icon}</span>
                          )}
                          {subCategory.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 项目数量（占位符） */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>项目数量</span>
                    <span>即将上线</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12">
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无分类</h3>
              <p className="mt-1 text-sm text-gray-500">
                分类正在建设中，敬请期待
              </p>
            </div>
          </div>
        )}

        {/* 底部说明 */}
        <div className="mt-12 text-center">
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              找不到合适的分类？
            </h3>
            <p className="text-blue-700 mb-4">
              我们正在不断完善分类体系，如果您有建议或需要特定分类，请联系我们。
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/contact"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                联系我们
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
              >
                浏览所有项目
              </Link>
            </div>
          </div>
        </div>
    </Layout>
  );
}
