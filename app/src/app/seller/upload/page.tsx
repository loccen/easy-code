'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/stores/authStore';
import { Layout } from '@/components/layout';
import { getActiveCategories } from '@/lib/categories';
import { Button, Card, Input, Loading } from '@/components/ui';
import { Category } from '@/types';
import { projectsService } from '@/lib/services/projects.service';

export default function ProjectUploadPage() {
  const { user, loading: authLoading, isSeller } = useAuth();
  const router = useRouter();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 表单数据
  const [formData, setFormData] = useState({
    title: '',
    short_description: '',
    description: '',
    category_id: '',
    price: '',
    tech_stack: [] as string[],
    demo_url: '',
    github_url: '',
    documentation_url: '',
    is_dockerized: false,
  });
  
  // 技术栈输入
  const [techStackInput, setTechStackInput] = useState('');
  
  // 文件上传
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // 权限检查
  useEffect(() => {
    if (!authLoading && (!user || !isSeller)) {
      router.push('/dashboard');
    }
  }, [authLoading, user, isSeller, router]);

  // 加载分类数据
  useEffect(() => {
    if (user && isSeller) {
      loadCategories();
    }
  }, [user, isSeller]);

  const loadCategories = async () => {
    try {
      const data = await getActiveCategories();
      setCategories(data);
    } catch (err) {
      console.error('加载分类失败:', err);
      setError('加载分类失败');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleTechStackAdd = () => {
    if (techStackInput.trim() && !formData.tech_stack.includes(techStackInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tech_stack: [...prev.tech_stack, techStackInput.trim()]
      }));
      setTechStackInput('');
    }
  };

  const handleTechStackRemove = (tech: string) => {
    setFormData(prev => ({
      ...prev,
      tech_stack: prev.tech_stack.filter(t => t !== tech)
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(files);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // 验证必填字段
      if (!formData.title.trim()) {
        setError('项目标题不能为空');
        return;
      }
      if (!formData.description.trim()) {
        setError('项目描述不能为空');
        return;
      }
      if (!formData.price || parseFloat(formData.price) < 0) {
        setError('请输入有效的价格');
        return;
      }

      // 创建项目记录 - 使用新的API
      const projectData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category_id: formData.category_id,
        tech_stack: formData.tech_stack.length > 0 ? formData.tech_stack : [],
        demo_url: formData.demo_url.trim() || undefined,
        github_url: formData.github_url.trim() || undefined,
        documentation: formData.documentation_url.trim() || undefined,
        features: [], // 可以后续添加功能特性字段
        requirements: [], // 可以后续添加使用要求字段
      };

      const apiResult = await projectsService.createProject(projectData);

      if (!apiResult.success) {
        throw new Error(apiResult.error?.message || '创建项目失败');
      }

      const project = apiResult.data;

      // 上传文件
      if (uploadedFiles.length > 0) {
        setUploading(true);
        try {
          const uploadResult = await projectsService.uploadProjectFiles(project.id, uploadedFiles);

          if (!uploadResult.success) {
            console.error('文件上传失败:', uploadResult.error);
            setError('项目创建成功，但文件上传失败。您可以稍后在项目管理页面重新上传文件。');
          }
        } catch (uploadError) {
          console.error('文件上传失败:', uploadError);
          setError('项目创建成功，但文件上传失败。您可以稍后在项目管理页面重新上传文件。');
        } finally {
          setUploading(false);
        }
      }

      setSuccess('项目创建成功！您可以在项目管理页面继续编辑或发布项目。');
      
      // 3秒后跳转到项目管理页面
      setTimeout(() => {
        router.push('/seller/projects');
      }, 3000);

    } catch (err) {
      console.error('创建项目失败:', err);
      setError(err instanceof Error ? err.message : '创建项目失败');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loading />
        </div>
      </Layout>
    );
  }

  if (!user || !isSeller) {
    return null;
  }

  // 获取顶级分类和子分类
  const topLevelCategories = categories.filter(cat => !cat.parent_id);
  const getSubCategories = (parentId: string) => 
    categories.filter(cat => cat.parent_id === parentId);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">上传项目</h1>
          <p className="mt-2 text-gray-600">发布您的源码项目到易码网平台</p>
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

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 基本信息 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    项目标题 *
                  </label>
                  <Input
                    id="title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="请输入项目标题"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="short_description" className="block text-sm font-medium text-gray-700 mb-1">
                    简短描述
                  </label>
                  <Input
                    id="short_description"
                    name="short_description"
                    type="text"
                    value={formData.short_description}
                    onChange={handleInputChange}
                    placeholder="一句话描述您的项目（可选）"
                    maxLength={500}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    详细描述 *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={6}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="详细描述您的项目功能、特点、使用方法等"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
                    项目分类
                  </label>
                  <select
                    id="category_id"
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">请选择分类</option>
                    {topLevelCategories.map((category) => (
                      <optgroup key={category.id} label={category.name}>
                        <option value={category.id}>{category.name}</option>
                        {getSubCategories(category.id).map((subCategory) => (
                          <option key={subCategory.id} value={subCategory.id}>
                            　├ {subCategory.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 价格信息 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">价格信息</h3>
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  价格（积分）*
                </label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="请输入积分数量"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  项目价格将以积分为单位，用户购买时将从积分余额中扣除
                </p>
              </div>
            </div>

            {/* 技术栈 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">技术栈</h3>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    value={techStackInput}
                    onChange={(e) => setTechStackInput(e.target.value)}
                    placeholder="输入技术栈（如：React, Node.js, MongoDB）"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTechStackAdd();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTechStackAdd}
                  >
                    添加
                  </Button>
                </div>
                
                {formData.tech_stack.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tech_stack.map((tech, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {tech}
                        <button
                          type="button"
                          onClick={() => handleTechStackRemove(tech)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 链接信息 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">相关链接</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="demo_url" className="block text-sm font-medium text-gray-700 mb-1">
                    演示地址
                  </label>
                  <Input
                    id="demo_url"
                    name="demo_url"
                    type="url"
                    value={formData.demo_url}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label htmlFor="github_url" className="block text-sm font-medium text-gray-700 mb-1">
                    GitHub地址
                  </label>
                  <Input
                    id="github_url"
                    name="github_url"
                    type="url"
                    value={formData.github_url}
                    onChange={handleInputChange}
                    placeholder="https://github.com/username/repo"
                  />
                </div>

                <div>
                  <label htmlFor="documentation_url" className="block text-sm font-medium text-gray-700 mb-1">
                    文档地址
                  </label>
                  <Input
                    id="documentation_url"
                    name="documentation_url"
                    type="url"
                    value={formData.documentation_url}
                    onChange={handleInputChange}
                    placeholder="https://docs.example.com"
                  />
                </div>
              </div>
            </div>

            {/* Docker配置 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">部署配置</h3>
              <div className="flex items-center">
                <input
                  id="is_dockerized"
                  name="is_dockerized"
                  type="checkbox"
                  checked={formData.is_dockerized}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_dockerized" className="ml-2 block text-sm text-gray-900">
                  项目支持Docker部署
                </label>
              </div>
            </div>

            {/* 文件上传 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">项目文件</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="w-full"
                  accept=".zip,.rar,.tar.gz,.7z"
                />
                <p className="mt-2 text-sm text-gray-500">
                  支持上传压缩文件（.zip, .rar, .tar.gz, .7z），单个文件最大100MB
                </p>
                {uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">已选择文件：</h4>
                    <ul className="text-sm text-gray-600">
                      {uploadedFiles.map((file, index) => (
                        <li key={index}>
                          {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                取消
              </Button>
              <Button
                type="submit"
                loading={loading || uploading}
                disabled={loading || uploading}
              >
                {uploading ? '上传文件中...' : loading ? '创建中...' : '创建项目'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
