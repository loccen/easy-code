'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/services/auth.service';
import { useAuthStore } from '@/stores/authStore';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  
  const router = useRouter();
  const { refreshUser } = useAuthStore();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // 重置检查状态
    if (name === 'username') {
      setUsernameAvailable(null);
    }
    if (name === 'email') {
      setEmailAvailable(null);
    }
  };

  const checkUsername = async () => {
    if (!formData.username || formData.username.length < 3) {
      setError('用户名至少需要3个字符');
      return;
    }

    setUsernameChecking(true);
    try {
      const result = await authService.checkUsernameAvailable(formData.username);
      if (result.success) {
        setUsernameAvailable(result.data?.available || false);
        if (!result.data?.available) {
          setError('用户名已被使用');
        } else {
          setError('');
        }
      } else {
        setError(result.error?.message || '检查用户名时出错');
        setUsernameAvailable(null);
      }
    } catch (err) {
      console.error('检查用户名失败:', err);
      setError('检查用户名时出错');
      setUsernameAvailable(null);
    } finally {
      setUsernameChecking(false);
    }
  };

  const checkEmail = async () => {
    if (!formData.email) {
      setError('请输入邮箱地址');
      return;
    }

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('邮箱格式不正确');
      return;
    }

    setEmailChecking(true);
    try {
      const result = await authService.checkEmailAvailable(formData.email);
      if (result.success) {
        setEmailAvailable(result.data?.available || false);
        if (!result.data?.available) {
          setError('邮箱已被使用');
        } else {
          setError('');
        }
      } else {
        setError(result.error?.message || '检查邮箱时出错');
        setEmailAvailable(null);
      }
    } catch (err) {
      console.error('检查邮箱失败:', err);
      setError('检查邮箱时出错');
      setEmailAvailable(null);
    } finally {
      setEmailChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 验证表单
    if (formData.password !== formData.confirmPassword) {
      setError('密码确认不匹配');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('密码至少需要6个字符');
      setLoading(false);
      return;
    }

    if (usernameAvailable === false) {
      setError('请选择一个可用的用户名');
      setLoading(false);
      return;
    }

    if (emailAvailable === false) {
      setError('请选择一个可用的邮箱');
      setLoading(false);
      return;
    }

    try {
      const result = await authService.register({
        email: formData.email,
        password: formData.password,
        username: formData.username,
      });

      if (result.success) {
        await refreshUser();
        router.push('/dashboard');
      } else {
        setError(result.error?.message || '注册失败');
      }
    } catch (err) {
      console.error('注册错误:', err);
      setError('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            注册易码网账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            已有账户？{' '}
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              立即登录
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                邮箱地址
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="请输入邮箱地址"
                />
                <button
                  type="button"
                  onClick={checkEmail}
                  disabled={emailChecking || !formData.email}
                  className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm disabled:opacity-50"
                >
                  {emailChecking ? '检查中...' : '检查'}
                </button>
              </div>
              {emailAvailable === true && (
                <p className="mt-1 text-sm text-green-600">✓ 邮箱可用</p>
              )}
              {emailAvailable === false && (
                <p className="mt-1 text-sm text-red-600">✗ 邮箱已被使用</p>
              )}
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                用户名
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="请输入用户名"
                />
                <button
                  type="button"
                  onClick={checkUsername}
                  disabled={usernameChecking || !formData.username}
                  className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm disabled:opacity-50"
                >
                  {usernameChecking ? '检查中...' : '检查'}
                </button>
              </div>
              {usernameAvailable === true && (
                <p className="mt-1 text-sm text-green-600">✓ 用户名可用</p>
              )}
              {usernameAvailable === false && (
                <p className="mt-1 text-sm text-red-600">✗ 用户名已被使用</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入密码（至少6个字符）"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                确认密码
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请再次输入密码"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || usernameAvailable === false}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
