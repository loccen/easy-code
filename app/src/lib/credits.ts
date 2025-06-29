import { supabase } from './supabase';
import type { 
  UserCredits, 
  CreditTransaction, 
  CreditConfig,
  CreditTransactionType,
  AddCreditsRequest,
  SpendCreditsRequest 
} from '@/types';

/**
 * 获取用户积分余额
 */
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 用户积分账户不存在，创建一个
        return await createUserCreditsAccount(userId);
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('获取用户积分失败:', error);
    throw error;
  }
}

/**
 * 创建用户积分账户
 */
export async function createUserCreditsAccount(userId: string): Promise<UserCredits> {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .insert({
        user_id: userId,
        total_credits: 0,
        available_credits: 0,
        frozen_credits: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('创建用户积分账户失败:', error);
    throw error;
  }
}

/**
 * 增加用户积分
 */
export async function addUserCredits(request: AddCreditsRequest): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('add_user_credits', {
      p_user_id: request.user_id,
      p_amount: request.amount,
      p_transaction_type: request.transaction_type,
      p_description: request.description || null,
      p_reference_id: request.reference_id || null,
      p_reference_type: request.reference_type || null,
      p_created_by: null
    });

    if (error) throw error;
    return data; // 返回交易ID
  } catch (error) {
    console.error('增加用户积分失败:', error);
    throw error;
  }
}

/**
 * 消费用户积分
 */
export async function spendUserCredits(request: SpendCreditsRequest): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('spend_user_credits', {
      p_user_id: request.user_id,
      p_amount: request.amount,
      p_transaction_type: request.transaction_type,
      p_description: request.description || null,
      p_reference_id: request.reference_id || null,
      p_reference_type: request.reference_type || null,
      p_created_by: null
    });

    if (error) throw error;
    return data; // 返回交易ID
  } catch (error) {
    console.error('消费用户积分失败:', error);
    throw error;
  }
}

/**
 * 获取用户积分交易历史
 */
export async function getUserCreditTransactions(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<CreditTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取积分交易历史失败:', error);
    throw error;
  }
}

/**
 * 获取积分配置
 */
export async function getCreditConfig(configKey: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_credit_config', {
      p_config_key: configKey
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('获取积分配置失败:', error);
    throw error;
  }
}

/**
 * 获取所有积分配置
 */
export async function getAllCreditConfigs(): Promise<CreditConfig[]> {
  try {
    const { data, error } = await supabase
      .from('credit_configs')
      .select('*')
      .eq('is_active', true)
      .order('config_key');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取积分配置列表失败:', error);
    throw error;
  }
}

/**
 * 检查用户积分是否足够
 */
export async function checkUserCreditsBalance(userId: string, amount: number): Promise<boolean> {
  try {
    const credits = await getUserCredits(userId);
    return credits ? credits.available_credits >= amount : false;
  } catch (error) {
    console.error('检查用户积分余额失败:', error);
    return false;
  }
}

/**
 * 用户注册时发放奖励积分
 */
export async function grantRegistrationBonus(userId: string): Promise<void> {
  try {
    const bonusAmount = await getCreditConfig('register_bonus');
    
    await addUserCredits({
      user_id: userId,
      amount: bonusAmount,
      transaction_type: 'earn_register',
      description: '注册奖励积分',
      reference_type: 'system'
    });
  } catch (error) {
    console.error('发放注册奖励积分失败:', error);
    // 注册奖励失败不应该阻止用户注册，只记录错误
  }
}

/**
 * 项目审核通过时发放奖励积分
 */
export async function grantUploadBonus(userId: string, projectId: string, isDockerized: boolean = false): Promise<void> {
  try {
    let bonusAmount = await getCreditConfig('upload_bonus');

    // Docker化项目获得双倍奖励
    if (isDockerized) {
      const multiplier = await getCreditConfig('docker_multiplier');
      bonusAmount *= multiplier;
    }

    await addUserCredits({
      user_id: userId,
      amount: bonusAmount,
      transaction_type: isDockerized ? 'earn_docker' : 'earn_upload',
      description: isDockerized ? 'Docker化项目审核通过奖励' : '项目审核通过奖励',
      reference_id: projectId,
      reference_type: 'project'
    });
  } catch (error) {
    console.error('发放项目审核通过奖励积分失败:', error);
    throw error;
  }
}

/**
 * 项目评价时发放奖励积分
 */
export async function grantReviewBonus(userId: string, projectId: string): Promise<void> {
  try {
    const bonusAmount = await getCreditConfig('review_bonus');
    
    await addUserCredits({
      user_id: userId,
      amount: bonusAmount,
      transaction_type: 'earn_review',
      description: '项目评价奖励',
      reference_id: projectId,
      reference_type: 'project'
    });
  } catch (error) {
    console.error('发放评价奖励积分失败:', error);
    throw error;
  }
}

/**
 * 购买项目时消费积分
 */
export async function purchaseProject(userId: string, projectId: string, amount: number): Promise<string> {
  try {
    // 检查积分余额
    const hasEnoughCredits = await checkUserCreditsBalance(userId, amount);
    if (!hasEnoughCredits) {
      throw new Error('积分余额不足');
    }
    
    // 消费积分
    const transactionId = await spendUserCredits({
      user_id: userId,
      amount: amount,
      transaction_type: 'spend_purchase',
      description: '购买项目',
      reference_id: projectId,
      reference_type: 'project'
    });
    
    return transactionId;
  } catch (error) {
    console.error('购买项目消费积分失败:', error);
    throw error;
  }
}

/**
 * 格式化积分交易类型显示文本
 */
export function formatTransactionType(type: CreditTransactionType): string {
  const typeMap: Record<CreditTransactionType, string> = {
    'earn_register': '注册奖励',
    'earn_upload': '上传项目',
    'earn_review': '评价项目',
    'earn_referral': '推荐奖励',
    'earn_daily': '每日签到',
    'earn_docker': 'Docker项目',
    'spend_purchase': '购买项目',
    'spend_feature': '项目置顶',
    'refund_purchase': '购买退款',
    'admin_adjust': '管理员调整'
  };
  
  return typeMap[type] || type;
}

/**
 * 格式化积分数量显示
 */
export function formatCreditsAmount(amount: number): string {
  if (amount >= 0) {
    return `+${amount.toLocaleString()}`;
  } else {
    return amount.toLocaleString();
  }
}

/**
 * 获取积分交易类型的颜色样式
 */
export function getTransactionTypeColor(type: CreditTransactionType): string {
  if (type.startsWith('earn_')) {
    return 'text-green-600';
  } else if (type.startsWith('spend_')) {
    return 'text-red-600';
  } else if (type.startsWith('refund_')) {
    return 'text-blue-600';
  } else {
    return 'text-gray-600';
  }
}
