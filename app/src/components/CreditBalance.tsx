'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getUserCredits } from '@/lib/credits';
import type { UserCredits } from '@/types';
import { Coins } from 'lucide-react';

interface CreditBalanceProps {
  showLabel?: boolean;
  className?: string;
}

export default function CreditBalance({ showLabel = true, className = '' }: CreditBalanceProps) {
  const { user } = useAuthStore();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCredits = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const userCredits = await getUserCredits(user.id);
      setCredits(userCredits);
    } catch (err) {
      console.error('加载积分余额失败:', err);
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    loadCredits();
  }, [user?.id, loadCredits]);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Coins className="w-4 h-4 text-yellow-500" />
        {showLabel && <span className="text-sm text-gray-600">积分:</span>}
        <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Coins className="w-4 h-4 text-gray-400" />
        {showLabel && <span className="text-sm text-gray-600">积分:</span>}
        <span className="text-sm text-red-500">--</span>
      </div>
    );
  }

  const availableCredits = credits?.available_credits || 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Coins className="w-4 h-4 text-yellow-500" />
      {showLabel && <span className="text-sm text-gray-600">积分:</span>}
      <span className="text-sm font-medium text-gray-900">
        {availableCredits.toLocaleString()}
      </span>
    </div>
  );
}
