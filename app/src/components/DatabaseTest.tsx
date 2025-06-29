'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ConnectionStatus {
  connected: boolean;
  error?: string;
  tables?: string[];
  categories?: Record<string, unknown>[];
}

export default function DatabaseTest() {
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setLoading(true);
    try {
      // 测试基本连接
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .limit(5);

      if (error) {
        setStatus({
          connected: false,
          error: error.message,
        });
      } else {
        setStatus({
          connected: true,
          categories: data || [],
        });
      }
    } catch (err) {
      setStatus({
        connected: false,
        error: err instanceof Error ? err.message : '未知错误',
      });
    } finally {
      setLoading(false);
    }
  };

  const testAuth = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('Auth session:', data, error);
    } catch (err) {
      console.error('Auth test error:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
          <span className="text-yellow-800">正在测试数据库连接...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 连接状态 */}
      <div
        className={`border rounded-lg p-4 ${
          status.connected
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full mr-2 ${
                status.connected ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></div>
            <span
              className={`font-medium ${
                status.connected ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {status.connected ? '数据库连接成功' : '数据库连接失败'}
            </span>
          </div>
          <button
            onClick={testConnection}
            className="text-sm bg-white border border-gray-300 rounded px-3 py-1 hover:bg-gray-50"
          >
            重新测试
          </button>
        </div>

        {status.error && (
          <div className="mt-2 text-sm text-red-600">
            错误信息: {status.error}
          </div>
        )}
      </div>

      {/* 数据展示 */}
      {status.connected && status.categories && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">分类数据预览</h3>
          <div className="space-y-2">
            {status.categories.map((category) => (
              <div
                key={(category as { id: string }).id}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
              >
                <div className="flex items-center">
                  <span className="font-medium">{(category as { name: string }).name}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({(category as { slug: string }).slug})
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    (category as { is_active: boolean }).is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {(category as { is_active: boolean }).is_active ? '激活' : '禁用'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 测试按钮 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">其他测试</h3>
        <div className="space-x-2">
          <button
            onClick={testAuth}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            测试认证
          </button>
          <button
            onClick={() => console.log('Supabase client:', supabase)}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            查看客户端
          </button>
        </div>
      </div>
    </div>
  );
}
