'use client';

import { useAuth } from '@/stores/authStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import CreditBalance from '@/components/CreditBalance';
import CreditTransactionHistory from '@/components/CreditTransactionHistory';

export default function DashboardPage() {
  const { user, loading, isAuthenticated, isAdmin, isSeller, isBuyer } = useAuth();
  const { signOut } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [loading, isAuthenticated, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">易</span>
                </div>
                <h1 className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">易码网</h1>
              </Link>
            </div>

            {/* 中间导航菜单 */}
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/projects" className="text-gray-600 hover:text-gray-900 transition-colors">
                项目市场
              </Link>
              <Link href="/categories" className="text-gray-600 hover:text-gray-900 transition-colors">
                分类
              </Link>
              <Link href="/profile" className="text-gray-600 hover:text-gray-900 transition-colors">
                个人资料
              </Link>
              <Link href="/settings" className="text-gray-600 hover:text-gray-900 transition-colors">
                设置
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                欢迎，{user.profile?.first_name || user.username}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 用户信息卡片 */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                用户信息
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">邮箱</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">用户名</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.username}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">角色</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'seller' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'admin' ? '管理员' : 
                       user.role === 'seller' ? '卖家' : '买家'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">状态</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status === 'active' ? '活跃' : '非活跃'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">注册时间</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">邮箱验证</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.email_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.email_verified ? '已验证' : '未验证'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">积分余额</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <CreditBalance showLabel={false} />
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* 权限信息 */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                权限信息
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className={`p-4 rounded-lg ${isAdmin ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${isAdmin ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm font-medium ${isAdmin ? 'text-purple-800' : 'text-gray-500'}`}>
                      管理员权限
                    </span>
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${isSeller ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${isSeller ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm font-medium ${isSeller ? 'text-green-800' : 'text-gray-500'}`}>
                      卖家权限
                    </span>
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${isBuyer ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${isBuyer ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm font-medium ${isBuyer ? 'text-blue-800' : 'text-gray-500'}`}>
                      买家权限
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 快速操作 */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                快速操作
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  onClick={() => router.push('/projects')}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900">浏览项目</div>
                  <div className="text-sm text-gray-500">查看平台上的所有项目</div>
                </button>
                {isSeller && (
                  <button
                    onClick={() => router.push('/seller/upload')}
                    className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900">上传项目</div>
                    <div className="text-sm text-gray-500">发布新的源码项目</div>
                  </button>
                )}
                <button
                  onClick={() => router.push('/profile')}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900">个人设置</div>
                  <div className="text-sm text-gray-500">管理个人资料和偏好</div>
                </button>
              </div>
            </div>
          </div>

          {/* 积分交易历史 */}
          <CreditTransactionHistory limit={5} className="mb-6" />
        </div>
      </div>
    </div>
  );
}
