import { supabase } from './supabase';
import { RoleUpgradeRequest, UserRole } from '@/types';

/**
 * 创建角色升级申请
 */
export async function createRoleUpgradeRequest(requestData: {
  to_role: UserRole;
  reason: string;
  experience?: string;
  portfolio_url?: string;
  github_url?: string;
}): Promise<RoleUpgradeRequest> {
  // 获取当前用户
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('用户未登录');
  }

  // 获取用户当前角色
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError) {
    throw new Error('获取用户信息失败');
  }

  const requestPayload = {
    user_id: user.id,
    from_role: userData.role,
    to_role: requestData.to_role,
    reason: requestData.reason,
    experience: requestData.experience,
    portfolio_url: requestData.portfolio_url,
    github_url: requestData.github_url,
  };

  const { data, error } = await supabase
    .from('role_upgrade_requests')
    .insert(requestPayload)
    .select()
    .single();

  if (error) {
    console.error('创建角色升级申请失败:', error);
    throw error;
  }

  return data;
}

/**
 * 获取用户的角色升级申请列表
 */
export async function getUserRoleUpgradeRequests(): Promise<RoleUpgradeRequest[]> {
  const { data, error } = await supabase
    .from('role_upgrade_requests')
    .select(`
      *,
      reviewer:users!reviewed_by(username, email)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取角色升级申请失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 获取所有角色升级申请（管理员用）
 */
export async function getAllRoleUpgradeRequests(status?: string): Promise<RoleUpgradeRequest[]> {
  let query = supabase
    .from('role_upgrade_requests')
    .select(`
      *,
      user:users!user_id(username, email, role),
      reviewer:users!reviewed_by(username, email)
    `);

  if (status) {
    query = query.eq('status', status);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('获取所有角色升级申请失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 获取待审核的角色升级申请
 */
export async function getPendingRoleUpgradeRequests(): Promise<RoleUpgradeRequest[]> {
  return getAllRoleUpgradeRequests('pending');
}

/**
 * 审核角色升级申请
 */
export async function reviewRoleUpgradeRequest(
  requestId: string,
  action: 'approved' | 'rejected',
  adminComment?: string
): Promise<RoleUpgradeRequest> {
  // 获取当前用户（管理员）
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('用户未登录');
  }

  const updateData = {
    status: action,
    admin_comment: adminComment,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('role_upgrade_requests')
    .update(updateData)
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    console.error('审核角色升级申请失败:', error);
    throw error;
  }

  return data;
}

/**
 * 取消角色升级申请
 */
export async function cancelRoleUpgradeRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('role_upgrade_requests')
    .delete()
    .eq('id', requestId)
    .eq('status', 'pending'); // 只能取消待审核的申请

  if (error) {
    console.error('取消角色升级申请失败:', error);
    throw error;
  }
}

/**
 * 检查用户是否有待审核的角色升级申请
 */
export async function hasPendingUpgradeRequest(toRole: UserRole): Promise<boolean> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return false;
  }

  const { data, error } = await supabase.rpc('has_pending_upgrade_request', {
    user_uuid: user.id,
    target_role: toRole
  });

  if (error) {
    console.error('检查待审核申请失败:', error);
    return false;
  }

  return data || false;
}

/**
 * 获取待审核申请数量（管理员用）
 */
export async function getPendingUpgradeRequestsCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_pending_upgrade_requests_count');

  if (error) {
    console.error('获取待审核申请数量失败:', error);
    return 0;
  }

  return data || 0;
}

/**
 * 更新角色升级申请
 */
export async function updateRoleUpgradeRequest(
  requestId: string,
  updateData: {
    reason?: string;
    experience?: string;
    portfolio_url?: string;
    github_url?: string;
  }
): Promise<RoleUpgradeRequest> {
  const { data, error } = await supabase
    .from('role_upgrade_requests')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending') // 只能更新待审核的申请
    .select()
    .single();

  if (error) {
    console.error('更新角色升级申请失败:', error);
    throw error;
  }

  return data;
}

/**
 * 获取角色升级申请详情
 */
export async function getRoleUpgradeRequestById(requestId: string): Promise<RoleUpgradeRequest | null> {
  const { data, error } = await supabase
    .from('role_upgrade_requests')
    .select(`
      *,
      user:users!user_id(username, email, role),
      reviewer:users!reviewed_by(username, email)
    `)
    .eq('id', requestId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // 未找到
    }
    console.error('获取角色升级申请详情失败:', error);
    throw error;
  }

  return data;
}

/**
 * 获取角色升级统计信息
 */
export async function getRoleUpgradeStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}> {
  const { data, error } = await supabase
    .from('role_upgrade_requests')
    .select('status');

  if (error) {
    console.error('获取角色升级统计失败:', error);
    throw error;
  }

  const stats = {
    total: data.length,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  data.forEach(request => {
    stats[request.status as keyof typeof stats]++;
  });

  return stats;
}
