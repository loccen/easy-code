'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useAuthStore } from '@/stores/authStore';
import { Layout } from '@/components/layout';
import { supabase } from '@/lib/supabase';
import { Button, Card, Input, Loading } from '@/components/ui';

export default function SettingsPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { signOut } = useAuthStore();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 密码修改表单
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // 邮箱修改表单
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: '',
  });
  
  // 账户删除确认
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 重定向未认证用户
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmailForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // 验证密码
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError('新密码确认不匹配');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        setError('新密码至少需要6个字符');
        return;
      }

      // 更新密码
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      setSuccess('密码更新成功！');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      console.error('更新密码失败:', err);
      setError(err instanceof Error ? err.message : '更新密码失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // 更新邮箱
      const { error } = await supabase.auth.updateUser({
        email: emailForm.newEmail
      });

      if (error) throw error;

      setSuccess('邮箱更新请求已发送，请检查新邮箱中的确认邮件');
      setEmailForm({
        newEmail: '',
        password: '',
      });
    } catch (err) {
      console.error('更新邮箱失败:', err);
      setError(err instanceof Error ? err.message : '更新邮箱失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirm !== 'DELETE') return;

    try {
      setLoading(true);
      setError('');

      // 删除用户数据（通过RLS策略会自动级联删除相关数据）
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (deleteError) throw deleteError;

      // 删除认证用户
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (authError) {
        console.warn('删除认证用户失败，但用户数据已删除:', authError);
      }

      // 登出并重定向
      await signOut();
      router.push('/');
    } catch (err) {
      console.error('删除账户失败:', err);
      setError(err instanceof Error ? err.message : '删除账户失败');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">账户设置</h1>
          <p className="mt-2 text-gray-600">管理您的账户安全和偏好设置</p>
        </div>

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

        <div className="space-y-8">
          {/* 修改密码 */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">修改密码</h3>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  当前密码
                </label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="请输入当前密码"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  新密码
                </label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="请输入新密码（至少6个字符）"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  确认新密码
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="请再次输入新密码"
                  required
                />
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={loading}
                  disabled={loading}
                >
                  更新密码
                </Button>
              </div>
            </form>
          </Card>

          {/* 修改邮箱 */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">修改邮箱</h3>
            <p className="text-sm text-gray-600 mb-4">
              当前邮箱：{user.email}
            </p>
            
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  新邮箱地址
                </label>
                <Input
                  id="newEmail"
                  name="newEmail"
                  type="email"
                  value={emailForm.newEmail}
                  onChange={handleEmailChange}
                  placeholder="请输入新的邮箱地址"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  确认密码
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={emailForm.password}
                  onChange={handleEmailChange}
                  placeholder="请输入当前密码以确认身份"
                  required
                />
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={loading}
                  disabled={loading}
                >
                  更新邮箱
                </Button>
              </div>
            </form>
          </Card>

          {/* 危险操作 */}
          <Card className="p-6 border-red-200">
            <h3 className="text-lg font-medium text-red-900 mb-6">危险操作</h3>
            
            <div className="space-y-6">
              {/* 删除账户 */}
              <div>
                <h4 className="text-base font-medium text-red-900 mb-2">删除账户</h4>
                <p className="text-sm text-red-700 mb-4">
                  删除账户将永久删除您的所有数据，包括个人资料、项目和交易记录。此操作不可撤销。
                </p>
                
                {!showDeleteConfirm ? (
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    删除账户
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="deleteConfirm" className="block text-sm font-medium text-red-700 mb-1">
                        请输入 &ldquo;DELETE&rdquo; 确认删除
                      </label>
                      <Input
                        id="deleteConfirm"
                        type="text"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder="DELETE"
                        className="border-red-300"
                      />
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirm('');
                        }}
                      >
                        取消
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirm !== 'DELETE' || loading}
                        loading={loading}
                      >
                        确认删除账户
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
