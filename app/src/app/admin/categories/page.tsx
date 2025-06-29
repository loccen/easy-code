'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/stores/authStore';
import { useDialogContext } from '@/components/DialogProvider';
import { Layout } from '@/components/layout';
import { supabase } from '@/lib/supabase';
import { Button, Card, Input, Loading } from '@/components/ui';
import { Category } from '@/types';

export default function CategoriesManagePage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { confirm } = useDialogContext();
  const router = useRouter();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 编辑状态
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parent_id: '',
    icon: '',
    sort_order: 0,
    is_active: true,
  });

  // 权限检查
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [authLoading, user, isAdmin, router]);

  // 加载分类数据
  useEffect(() => {
    if (user && isAdmin) {
      loadCategories();
    }
  }, [user, isAdmin]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          parent:categories!parent_id(name)
        `)
        .order('sort_order');

      if (error) throw error;

      setCategories(data || []);
    } catch (err) {
      console.error('加载分类失败:', err);
      setError('加载分类失败');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      parent_id: '',
      icon: '',
      sort_order: 0,
      is_active: true,
    });
    setEditingCategory(null);
    setShowAddForm(false);
  };

  const handleAdd = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parent_id: category.parent_id || '',
      icon: category.icon || '',
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
    setEditingCategory(category);
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      setSuccess('');

      if (editingCategory) {
        // 更新分类
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            parent_id: formData.parent_id || null,
            icon: formData.icon || null,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        setSuccess('分类更新成功！');
      } else {
        // 创建分类
        const { error } = await supabase
          .from('categories')
          .insert({
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            parent_id: formData.parent_id || null,
            icon: formData.icon || null,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          });

        if (error) throw error;
        setSuccess('分类创建成功！');
      }

      resetForm();
      await loadCategories();
    } catch (err) {
      console.error('保存分类失败:', err);
      setError(err instanceof Error ? err.message : '保存分类失败');
    }
  };

  const handleDelete = async (category: Category) => {
    try {
      setError('');

      // 首先检查是否有项目使用该分类
      const { data: projects, error: checkError } = await supabase
        .from('projects')
        .select('id, title')
        .eq('category_id', category.id);

      if (checkError) throw checkError;

      // 检查是否有子分类
      const { data: subCategories, error: subError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('parent_id', category.id);

      if (subError) throw subError;

      // 如果有依赖项目或子分类，显示详细信息并询问用户
      if (projects && projects.length > 0) {
        const projectNames = projects.slice(0, 3).map(p => p.title).join('、');
        const moreText = projects.length > 3 ? `等${projects.length}个项目` : '';

        const confirmed1 = await confirm({
          title: '分类正在使用中',
          message: `分类"${category.name}"正在被以下项目使用：${projectNames}${moreText}\n\n删除此分类将导致这些项目失去分类信息。\n建议先将这些项目移动到其他分类，或者禁用此分类而不是删除。\n\n确定要强制删除吗？`,
          confirmText: '强制删除',
          cancelText: '取消',
          variant: 'danger'
        });

        if (!confirmed1) return;
      }

      if (subCategories && subCategories.length > 0) {
        const subNames = subCategories.map(c => c.name).join('、');

        const confirmed2 = await confirm({
          title: '包含子分类',
          message: `分类"${category.name}"包含以下子分类：${subNames}\n\n删除此分类将同时删除所有子分类。\n\n确定要继续吗？`,
          confirmText: '继续删除',
          cancelText: '取消',
          variant: 'danger'
        });

        if (!confirmed2) return;
      }

      // 最终确认
      const finalConfirmed = await confirm({
        title: '删除分类',
        message: `确定要删除分类"${category.name}"吗？\n\n此操作不可撤销。`,
        confirmText: '删除',
        cancelText: '取消',
        variant: 'danger'
      });

      if (!finalConfirmed) return;

      // 如果有项目使用该分类，先将项目的分类设为null
      if (projects && projects.length > 0) {
        const { error: updateError } = await supabase
          .from('projects')
          .update({ category_id: null })
          .eq('category_id', category.id);

        if (updateError) throw updateError;
      }

      // 如果有子分类，先删除子分类
      if (subCategories && subCategories.length > 0) {
        const { error: deleteSubError } = await supabase
          .from('categories')
          .delete()
          .eq('parent_id', category.id);

        if (deleteSubError) throw deleteSubError;
      }

      // 最后删除分类本身
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;

      setSuccess('分类删除成功！');
      await loadCategories();
    } catch (err) {
      console.error('删除分类失败:', err);
      setError(err instanceof Error ? err.message : '删除分类失败');
    }
  };

  const toggleActive = async (category: Category) => {
    try {
      setError('');
      
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);

      if (error) throw error;

      setSuccess(`分类已${category.is_active ? '禁用' : '启用'}！`);
      await loadCategories();
    } catch (err) {
      console.error('更新分类状态失败:', err);
      setError(err instanceof Error ? err.message : '更新分类状态失败');
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loading />
        </div>
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  // 获取顶级分类（用于父分类选择）
  const topLevelCategories = categories.filter(cat => !cat.parent_id);

  return (
    <Layout>
        {/* 页面标题 */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">分类管理</h1>
            <p className="mt-2 text-gray-600">管理项目分类和层级结构</p>
          </div>
          <Button onClick={handleAdd}>
            添加分类
          </Button>
        </div>

        {/* 错误和成功消息 */}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 分类列表 */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">分类列表</h3>
              
              <div className="space-y-4">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={`p-4 border rounded-lg ${
                      category.parent_id ? 'ml-8 border-gray-200' : 'border-gray-300'
                    } ${!category.is_active ? 'bg-gray-50 opacity-60' : 'bg-white'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {category.icon && (
                          <span className="text-xl">{category.icon}</span>
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {category.name}
                            {!category.is_active && (
                              <span className="ml-2 text-xs text-gray-500">(已禁用)</span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {category.slug}
                            {category.parent_id && (
                              <span className="ml-2">
                                • 父分类: {(category as Category & { parent?: { name: string } }).parent?.name}
                              </span>
                            )}
                          </p>
                          {category.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(category)}
                        >
                          {category.is_active ? '禁用' : '启用'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(category)}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {categories.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    暂无分类数据
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* 添加/编辑表单 */}
          {showAddForm && (
            <div className="lg:col-span-1">
              <Card className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">
                  {editingCategory ? '编辑分类' : '添加分类'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      分类名称 *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleNameChange}
                      placeholder="请输入分类名称"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                      URL标识 *
                    </label>
                    <Input
                      id="slug"
                      name="slug"
                      type="text"
                      value={formData.slug}
                      onChange={handleInputChange}
                      placeholder="自动生成或手动输入"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      描述
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="请输入分类描述"
                    />
                  </div>

                  <div>
                    <label htmlFor="parent_id" className="block text-sm font-medium text-gray-700 mb-1">
                      父分类
                    </label>
                    <select
                      id="parent_id"
                      name="parent_id"
                      value={formData.parent_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">无（顶级分类）</option>
                      {topLevelCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="icon" className="block text-sm font-medium text-gray-700 mb-1">
                      图标
                    </label>
                    <Input
                      id="icon"
                      name="icon"
                      type="text"
                      value={formData.icon}
                      onChange={handleInputChange}
                      placeholder="🌐 或 emoji"
                    />
                  </div>

                  <div>
                    <label htmlFor="sort_order" className="block text-sm font-medium text-gray-700 mb-1">
                      排序
                    </label>
                    <Input
                      id="sort_order"
                      name="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={handleInputChange}
                      placeholder="数字越小排序越靠前"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      id="is_active"
                      name="is_active"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                      启用分类
                    </label>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                    >
                      取消
                    </Button>
                    <Button type="submit">
                      {editingCategory ? '更新' : '创建'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
    </Layout>
  );
}
