'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { 
  Button, 
  Input, 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter,
  Badge, 
  Avatar, 
  Loading 
} from '@/components/ui';

export default function ComponentsPage() {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoadingTest = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };

  return (
    <Layout>
      <div className="space-y-12">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            UI 组件展示
          </h1>
          <p className="text-xl text-gray-600">
            易码网设计系统组件库演示
          </p>
        </div>

        {/* Button Components */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Button 按钮组件</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Button Variants */}
              <div>
                <h3 className="text-lg font-medium mb-3">按钮变体</h3>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">主要按钮</Button>
                  <Button variant="secondary">次要按钮</Button>
                  <Button variant="outline">轮廓按钮</Button>
                  <Button variant="ghost">幽灵按钮</Button>
                  <Button variant="danger">危险按钮</Button>
                </div>
              </div>

              {/* Button Sizes */}
              <div>
                <h3 className="text-lg font-medium mb-3">按钮尺寸</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">小按钮</Button>
                  <Button size="md">中按钮</Button>
                  <Button size="lg">大按钮</Button>
                </div>
              </div>

              {/* Button States */}
              <div>
                <h3 className="text-lg font-medium mb-3">按钮状态</h3>
                <div className="flex flex-wrap gap-3">
                  <Button>正常状态</Button>
                  <Button disabled>禁用状态</Button>
                  <Button loading={loading} onClick={handleLoadingTest}>
                    {loading ? '加载中...' : '点击测试加载'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Input Components */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Input 输入组件</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 max-w-md">
              <Input
                label="基础输入框"
                placeholder="请输入内容"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              
              <Input
                label="带图标的输入框"
                placeholder="搜索..."
                leftIcon={
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
              
              <Input
                label="带错误的输入框"
                placeholder="请输入邮箱"
                error="邮箱格式不正确"
              />
              
              <Input
                label="带帮助文本的输入框"
                placeholder="请输入用户名"
                helperText="用户名长度应在3-20个字符之间"
              />
              
              <Input
                label="禁用状态"
                placeholder="禁用的输入框"
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Badge Components */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Badge 标识组件</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Badge Variants */}
              <div>
                <h3 className="text-lg font-medium mb-3">标识变体</h3>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="default">默认</Badge>
                  <Badge variant="primary">主要</Badge>
                  <Badge variant="success">成功</Badge>
                  <Badge variant="warning">警告</Badge>
                  <Badge variant="danger">危险</Badge>
                  <Badge variant="outline">轮廓</Badge>
                </div>
              </div>

              {/* Badge Sizes */}
              <div>
                <h3 className="text-lg font-medium mb-3">标识尺寸</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge size="sm">小标识</Badge>
                  <Badge size="md">中标识</Badge>
                  <Badge size="lg">大标识</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avatar Components */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Avatar 头像组件</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Avatar Sizes */}
              <div>
                <h3 className="text-lg font-medium mb-3">头像尺寸</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar size="sm" fallback="小" />
                  <Avatar size="md" fallback="中" />
                  <Avatar size="lg" fallback="大" />
                  <Avatar size="xl" fallback="超大" />
                </div>
              </div>

              {/* Avatar with Images */}
              <div>
                <h3 className="text-lg font-medium mb-3">带图片的头像</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar 
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
                    alt="用户头像"
                    size="md"
                  />
                  <Avatar 
                    src="invalid-url"
                    alt="张三"
                    size="md"
                  />
                  <Avatar alt="李四" size="md" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading Components */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Loading 加载组件</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Loading Variants */}
              <div>
                <h3 className="text-lg font-medium mb-3">加载变体</h3>
                <div className="flex flex-wrap items-center gap-8">
                  <Loading variant="spinner" text="旋转加载" />
                  <Loading variant="dots" text="点状加载" />
                  <Loading variant="pulse" text="脉冲加载" />
                </div>
              </div>

              {/* Loading Sizes */}
              <div>
                <h3 className="text-lg font-medium mb-3">加载尺寸</h3>
                <div className="flex flex-wrap items-center gap-8">
                  <Loading size="sm" />
                  <Loading size="md" />
                  <Loading size="lg" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Components */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Card 卡片组件</h2>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Card */}
              <Card>
                <CardContent>
                  <h3 className="text-lg font-semibold mb-2">基础卡片</h3>
                  <p className="text-gray-600">这是一个基础的卡片组件示例。</p>
                </CardContent>
              </Card>

              {/* Card with Header and Footer */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">完整卡片</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">这是一个包含头部、内容和底部的完整卡片。</p>
                </CardContent>
                <CardFooter>
                  <Button size="sm">操作按钮</Button>
                </CardFooter>
              </Card>

              {/* Hover Card */}
              <Card hover>
                <CardContent>
                  <h3 className="text-lg font-semibold mb-2">悬停效果卡片</h3>
                  <p className="text-gray-600">鼠标悬停时会有提升效果。</p>
                </CardContent>
              </Card>

              {/* Interactive Card */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent>
                  <h3 className="text-lg font-semibold mb-2 text-blue-900">自定义样式卡片</h3>
                  <p className="text-blue-700">可以通过className自定义卡片样式。</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
