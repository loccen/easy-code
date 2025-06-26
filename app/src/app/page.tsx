import DatabaseTest from '@/components/DatabaseTest';
import { Layout } from '@/components/layout';
import { Button, Card, CardHeader, CardContent, Badge } from '@/components/ui';

export default function Home() {
  return (
    <Layout>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 -mx-4 sm:-mx-6 lg:-mx-8 -mt-8 px-4 sm:px-6 lg:px-8 pt-8">
        <div className="container mx-auto py-16">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              易码网
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              专业的源码交易平台，为开发者提供安全、高效的源码交易体验
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg">
                开始探索
              </Button>
              <Button variant="outline" size="lg">
                了解更多
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <Card hover>
          <CardContent>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">安全可靠</h3>
            <p className="text-gray-600">严格的代码审核机制，确保每个项目的质量和安全性</p>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">一键部署</h3>
            <p className="text-gray-600">基于Docker的容器化部署，支持快速演示和测试</p>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">积分经济</h3>
            <p className="text-gray-600">创新的积分激励机制，鼓励优质内容创作和分享</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Section */}
      <Card className="text-center mb-8">
        <CardContent>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">项目状态</h2>
          <div className="flex justify-center mb-4">
            <Badge variant="success" size="lg">✅ 设计阶段完成</Badge>
          </div>
          <p className="text-gray-600 mb-4">正在进行开发实施阶段</p>
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              当前正在搭建基础架构，包括用户认证系统、项目管理功能等核心模块
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Database Test Section */}
      <Card className="mt-8">
        <CardHeader>
          <h2 className="text-2xl font-bold text-gray-900">数据库连接测试</h2>
        </CardHeader>
        <CardContent>
          <DatabaseTest />
        </CardContent>
      </Card>
    </Layout>
  );
}
