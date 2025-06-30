'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/stores/authStore';
import { Layout } from '@/components/layout';
import { supabase } from '@/lib/supabase';

import { Button, Card, Input, Loading } from '@/components/ui';

export default function SettingsPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
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
  

  
  // 账户删除确认
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 重定向未认证用户
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // 确保表单字段为空（防止浏览器自动填充）
  useEffect(() => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  }, []);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };



  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // 验证表单
      if (!passwordForm.currentPassword) {
        setError('请输入当前密码');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError('新密码确认不匹配');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        setError('新密码至少需要6个字符');
        return;
      }

      // 先验证当前密码
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword
      });

      if (signInError) {
        setError('当前密码不正确');
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



  const handleDeleteAccount = async () => {
    if (!user || deleteConfirm !== 'DELETE') return;

    try {
      setLoading(true);
      setError('');

      // 使用软删除函数，现在它会同时删除 auth.users 记录
      const { error: rpcError } = await supabase.rpc('soft_delete_user_account');

      if (rpcError) {
        console.error('删除账户失败:', rpcError);
        throw new Error(rpcError.message || '删除账户失败');
      }

      // 删除成功后，清理前端认证状态
      // 由于后端已经删除了 auth.users 记录，前端 session 会自动失效
      // 但我们需要手动清理本地状态
      await supabase.auth.signOut();

      // 等待一下确保状态更新
      await new Promise(resolve => setTimeout(resolve, 100));

      // 重定向到首页
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
                  autoComplete="current-password"
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
                  autoComplete="new-password"
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
                  autoComplete="new-password"
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
