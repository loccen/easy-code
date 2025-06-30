'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Card } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { getUserCredits } from '@/lib/credits';
import { createOrder, completeCreditsOrder } from '@/lib/orders';
import { refreshCreditBalance } from '@/components/CreditBalance';
import type { Project, UserCredits } from '@/types';
import { X, Coins } from 'lucide-react';

interface PurchaseDialogProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PurchaseDialog({ 
  project, 
  isOpen, 
  onClose, 
  onSuccess 
}: PurchaseDialogProps) {
  const { user } = useAuthStore();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'confirm' | 'processing'>('confirm');

  const loadUserCredits = useCallback(async () => {
    if (!user?.id) return;

    try {
      const userCredits = await getUserCredits(user.id);
      setCredits(userCredits);
    } catch (err) {
      console.error('加载积分余额失败:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadUserCredits();
    }
  }, [isOpen, user?.id, loadUserCredits]);

  const handlePurchase = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      setStep('processing');

      // 创建订单（固定使用积分支付）
      const orderId = await createOrder({
        project_id: project.id,
        payment_method: 'credits'
      });

      // 完成积分支付
      await completeCreditsOrder(orderId);

      // 刷新积分余额
      refreshCreditBalance();

      onSuccess();
    } catch (err) {
      console.error('购买失败:', err);
      setError(err instanceof Error ? err.message : '购买失败，请稍后重试');
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return `${price.toLocaleString()} 积分`;
  };

  const canAfford = credits ? credits.available_credits >= project.price : false;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {step === 'processing' ? '处理中...' : '确认购买'}
            </h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 项目信息 */}
          <div className="mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">{project.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{project.short_description}</p>
                <div className="text-lg font-semibold text-blue-600">
                  {formatPrice(project.price)}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {step === 'confirm' && (
            <>
              {/* 积分余额显示 */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Coins className="w-6 h-6 text-blue-600" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">积分支付</h4>
                    <p className="text-sm text-gray-600">
                      当前余额: {credits?.available_credits.toLocaleString() || 0} 积分
                    </p>
                    <p className="text-sm text-gray-600">
                      需要支付: {project.price.toLocaleString()} 积分
                    </p>
                    {!canAfford && (
                      <p className="text-sm text-red-600 mt-1">
                        ⚠️ 积分余额不足，请先充值
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 购买须知 */}
              <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">购买须知</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• 购买后可永久使用，支持重复下载</li>
                  <li>• 项目文件仅供个人学习和商业使用</li>
                  <li>• 不支持退款，请仔细确认后购买</li>
                  <li>• 如有问题请联系客服或项目作者</li>
                </ul>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={loading}
                >
                  取消
                </Button>
                <Button
                  onClick={handlePurchase}
                  className="flex-1"
                  disabled={loading || !canAfford}
                >
                  支付 {project.price.toLocaleString()} 积分
                </Button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">正在处理您的订单...</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
