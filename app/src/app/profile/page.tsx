'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/stores/authStore';
import { Layout } from '@/components/layout';
import { supabase } from '@/lib/supabase';
import { Button, Card, Input, Loading } from '@/components/ui';
import AvatarUpload from '@/components/AvatarUpload';
import { UserProfile } from '@/types';

export default function ProfilePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    github_url: '',
    website_url: '',
    location: '',
    timezone: '',
    language: 'zh-CN',
  });

  // 重定向未认证用户
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setProfile(data);
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          bio: data.bio || '',
          github_url: data.github_url || '',
          website_url: data.website_url || '',
          location: data.location || '',
          timezone: data.timezone || '',
          language: data.language || 'zh-CN',
        });
      }
    } catch (err) {
      console.error('加载用户资料失败:', err);
      setError('加载用户资料失败');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 加载用户资料
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user, loadProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const profileData = {
        user_id: user.id,
        ...formData,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;

      setSuccess('资料更新成功！');
      await loadProfile(); // 重新加载资料
    } catch (err) {
      console.error('更新资料失败:', err);
      setError(err instanceof Error ? err.message : '更新资料失败');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
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
          <h1 className="text-3xl font-bold text-gray-900">个人资料</h1>
          <p className="mt-2 text-gray-600">管理您的个人信息和偏好设置</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：头像和基本信息 */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="text-center">
                <AvatarUpload
                  currentAvatarUrl={profile?.avatar_url}
                  onUploadSuccess={() => {
                    loadProfile(); // 重新加载资料以获取最新头像
                    setSuccess('头像更新成功！');
                  }}
                  size="xl"
                />
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {formData.first_name || formData.last_name
                      ? `${formData.first_name} ${formData.last_name}`.trim()
                      : user.username
                    }
                  </h3>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>

              {/* 账户信息 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">账户信息</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">角色</span>
                    <span className="text-gray-900">{user.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">状态</span>
                    <span className="text-green-600">{user.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">注册时间</span>
                    <span className="text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* 右侧：编辑表单 */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">编辑资料</h3>
              
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 姓名 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                      名字
                    </label>
                    <Input
                      id="first_name"
                      name="first_name"
                      type="text"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="请输入名字"
                    />
                  </div>
                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                      姓氏
                    </label>
                    <Input
                      id="last_name"
                      name="last_name"
                      type="text"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="请输入姓氏"
                    />
                  </div>
                </div>

                {/* 个人简介 */}
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    个人简介
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="介绍一下自己..."
                  />
                </div>

                {/* 社交链接 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="github_url" className="block text-sm font-medium text-gray-700 mb-1">
                      GitHub
                    </label>
                    <Input
                      id="github_url"
                      name="github_url"
                      type="url"
                      value={formData.github_url}
                      onChange={handleInputChange}
                      placeholder="https://github.com/username"
                    />
                  </div>
                  <div>
                    <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-1">
                      个人网站
                    </label>
                    <Input
                      id="website_url"
                      name="website_url"
                      type="url"
                      value={formData.website_url}
                      onChange={handleInputChange}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                {/* 位置和时区 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                      所在地
                    </label>
                    <Input
                      id="location"
                      name="location"
                      type="text"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="城市, 国家"
                    />
                  </div>
                  <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                      时区
                    </label>
                    <select
                      id="timezone"
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">选择时区</option>
                      <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                      <option value="Asia/Hong_Kong">Asia/Hong_Kong (UTC+8)</option>
                      <option value="Asia/Taipei">Asia/Taipei (UTC+8)</option>
                      <option value="UTC">UTC (UTC+0)</option>
                      <option value="America/New_York">America/New_York (UTC-5)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
                    </select>
                  </div>
                </div>

                {/* 语言偏好 */}
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                    语言偏好
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="zh-TW">繁体中文</option>
                    <option value="en-US">English</option>
                  </select>
                </div>

                {/* 提交按钮 */}
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    loading={saving}
                    disabled={saving}
                  >
                    保存更改
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
