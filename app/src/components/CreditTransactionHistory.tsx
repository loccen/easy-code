'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getUserCreditTransactions, formatTransactionType, formatCreditsAmount, getTransactionTypeColor } from '@/lib/credits';
import type { CreditTransaction } from '@/types';
import { Clock, RefreshCw } from 'lucide-react';
import Button from './ui/Button';

interface CreditTransactionHistoryProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export default function CreditTransactionHistory({ 
  limit = 10, 
  showHeader = true, 
  className = '' 
}: CreditTransactionHistoryProps) {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getUserCreditTransactions(user.id, limit);
      setTransactions(data);
    } catch (err) {
      console.error('加载积分交易历史失败:', err);
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, [user?.id, limit]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    loadTransactions();
  }, [user?.id, limit, loadTransactions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {showHeader && (
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">积分交易记录</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadTransactions}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      )}

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="w-24 h-4 bg-gray-200 rounded mb-1"></div>
                    <div className="w-32 h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-16 h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="w-20 h-3 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">加载失败</div>
            <Button variant="outline" size="sm" onClick={loadTransactions}>
              重试
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>暂无交易记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                    transaction.amount > 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {transaction.amount > 0 ? '+' : '-'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {formatTransactionType(transaction.transaction_type)}
                    </div>
                    {transaction.description && (
                      <div className="text-sm text-gray-500">
                        {transaction.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                    {formatCreditsAmount(transaction.amount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(transaction.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {transactions.length > 0 && transactions.length >= limit && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              查看更多
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
