'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Layout } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { getUserPurchaseHistory } from '@/lib/orders';
import { useAuth } from '@/stores/authStore';
import type { PurchaseHistoryItem } from '@/types';
import { Download, Calendar, CreditCard, ExternalLink } from 'lucide-react';

export default function PurchasesPage() {
  const { user, isAuthenticated } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadPurchases = useCallback(async (page: number = 1) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * itemsPerPage;
      const result = await getUserPurchaseHistory(user.id, itemsPerPage, offset);
      
      setPurchases(result.purchases);
      setTotal(result.total);
      setCurrentPage(page);
    } catch (err) {
      console.error('加载购买历史失败:', err);
      setError('加载购买历史失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadPurchases();
    }
  }, [isAuthenticated, user?.id, loadPurchases]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  const totalPages = Math.ceil(total / itemsPerPage);

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">请先登录</h2>
            <p className="text-gray-600 mb-6">您需要登录后才能查看购买历史</p>
            <Link href="/auth/login">
              <Button>立即登录</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">我的购买</h1>
          <p className="text-gray-600">查看您购买的所有项目和下载记录</p>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">总购买数</p>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Download className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">可下载项目</p>
                <p className="text-2xl font-bold text-gray-900">{purchases.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">最近购买</p>
                <p className="text-sm font-medium text-gray-900">
                  {purchases.length > 0 ? formatDate(purchases[0].created_at).split(' ')[0] : '暂无'}
                </p>
              </div>
            </div>
          </Card>
        </div>

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
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => loadPurchases(currentPage)}>
              重试
            </Button>
          </Card>
        )}

        {/* 购买历史列表 */}
        {!loading && !error && (
          <>
            {purchases.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="text-gray-500">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无购买记录</h3>
                  <p className="text-gray-500 mb-6">
                    您还没有购买任何项目，去项目市场看看吧
                  </p>
                  <Link href="/projects">
                    <Button>浏览项目</Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <>
                {/* 购买项目列表 */}
                <div className="space-y-6 mb-8">
                  {purchases.map((purchase) => (
                    <PurchaseCard key={purchase.order_id} purchase={purchase} />
                  ))}
                </div>

                {/* 分页 */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => loadPurchases(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      上一页
                    </Button>
                    
                    <span className="text-sm text-gray-600">
                      第 {currentPage} 页，共 {totalPages} 页
                    </span>
                    
                    <Button
                      variant="outline"
                      onClick={() => loadPurchases(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      下一页
                    </Button>
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

// 购买项目卡片组件
function PurchaseCard({ purchase }: { purchase: PurchaseHistoryItem }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return `${price.toLocaleString()} 积分`;
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex items-start space-x-4">
          {/* 项目图片 */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center relative overflow-hidden">
              {purchase.project_thumbnail ? (
                <Image
                  src={purchase.project_thumbnail}
                  alt={purchase.project_title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="text-center text-gray-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* 项目信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {purchase.project_title}
                </h3>
                
                {purchase.project_description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {purchase.project_description}
                  </p>
                )}



                {/* 购买信息 */}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(purchase.created_at)}
                  </span>
                  <span className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-1" />
                    {formatPrice(purchase.final_amount)}
                  </span>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col space-y-2 ml-4">
                <Link href={`/projects/${purchase.project_id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    查看详情
                  </Button>
                </Link>
                
                {purchase.project_files && purchase.project_files.length > 0 && (
                  <Button size="sm" className="w-full">
                    <Download className="w-4 h-4 mr-1" />
                    下载文件
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
