import { supabase } from './supabase';
import type {
  Order,
  OrderDownload,
  CreateOrderRequest,
  PurchaseHistoryItem,
  SalesStats
} from '@/types';

/**
 * 创建订单
 */
export async function createOrder(request: CreateOrderRequest): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('create_order', {
      p_buyer_id: (await supabase.auth.getUser()).data.user?.id,
      p_project_id: request.project_id,
      p_payment_method: request.payment_method || 'credits'
    });

    if (error) throw error;
    return data; // 返回订单ID
  } catch (error) {
    console.error('创建订单失败:', error);
    throw error;
  }
}

/**
 * 完成积分支付订单
 */
export async function completeCreditsOrder(orderId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('complete_credits_order', {
      p_order_id: orderId
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('完成积分支付失败:', error);
    throw error;
  }
}

/**
 * 取消订单
 */
export async function cancelOrder(orderId: string, reason?: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('cancel_order', {
      p_order_id: orderId,
      p_reason: reason || null
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('取消订单失败:', error);
    throw error;
  }
}

/**
 * 获取订单详情
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        project:projects(
          id, title, short_description, thumbnail_url, file_urls, tech_stack
        ),
        buyer:users!orders_buyer_id_fkey(
          id, username, email
        ),
        seller:users!orders_seller_id_fkey(
          id, username, email
        )
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 未找到
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('获取订单详情失败:', error);
    throw error;
  }
}

/**
 * 获取用户的购买历史
 */
export async function getUserPurchaseHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ purchases: PurchaseHistoryItem[]; total: number }> {
  try {
    const { data, error, count } = await supabase
      .from('user_purchase_history')
      .select('*', { count: 'exact' })
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      purchases: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('获取购买历史失败:', error);
    throw error;
  }
}

/**
 * 获取卖家的销售订单
 */
export async function getSellerOrders(
  sellerId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ orders: Order[]; total: number }> {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        project:projects(
          id, title, short_description, thumbnail_url
        ),
        buyer:users!orders_buyer_id_fkey(
          id, username, email
        )
      `, { count: 'exact' })
      .eq('seller_id', sellerId);

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      orders: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('获取销售订单失败:', error);
    throw error;
  }
}

/**
 * 获取卖家销售统计
 */
export async function getSellerSalesStats(sellerId: string): Promise<SalesStats | null> {
  try {
    const { data, error } = await supabase
      .from('seller_sales_stats')
      .select('*')
      .eq('seller_id', sellerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 没有销售记录，返回默认值
        return {
          seller_id: sellerId,
          total_orders: 0,
          completed_orders: 0,
          pending_orders: 0,
          cancelled_orders: 0,
          total_revenue: 0,
          avg_order_value: 0
        };
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('获取销售统计失败:', error);
    throw error;
  }
}

/**
 * 检查用户是否已购买项目
 */
export async function checkUserPurchased(userId: string, projectId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('buyer_id', userId)
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .limit(1);

    if (error) throw error;
    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('检查购买状态失败:', error);
    return false;
  }
}

/**
 * 记录文件下载
 */
export async function recordFileDownload(
  orderId: string,
  userId: string,
  fileUrl: string,
  fileName: string,
  fileSize?: number,
  downloadIp?: string,
  userAgent?: string
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('record_file_download', {
      p_order_id: orderId,
      p_user_id: userId,
      p_file_url: fileUrl,
      p_file_name: fileName,
      p_file_size: fileSize || null,
      p_download_ip: downloadIp || null,
      p_user_agent: userAgent || null
    });

    if (error) throw error;
    return data; // 返回下载记录ID
  } catch (error) {
    console.error('记录文件下载失败:', error);
    throw error;
  }
}

/**
 * 获取订单的下载记录
 */
export async function getOrderDownloads(orderId: string): Promise<OrderDownload[]> {
  try {
    const { data, error } = await supabase
      .from('order_downloads')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取下载记录失败:', error);
    throw error;
  }
}

/**
 * 管理员获取所有订单
 */
export async function getAllOrdersForAdmin(options?: {
  status?: string;
  buyerId?: string;
  sellerId?: string;
  projectId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'final_amount';
  sortOrder?: 'asc' | 'desc';
}): Promise<{ orders: Order[]; total: number }> {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        project:projects(
          id, title, short_description, thumbnail_url
        ),
        buyer:users!orders_buyer_id_fkey(
          id, username, email
        ),
        seller:users!orders_seller_id_fkey(
          id, username, email
        )
      `, { count: 'exact' });

    // 状态筛选
    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    // 买家筛选
    if (options?.buyerId) {
      query = query.eq('buyer_id', options.buyerId);
    }

    // 卖家筛选
    if (options?.sellerId) {
      query = query.eq('seller_id', options.sellerId);
    }

    // 项目筛选
    if (options?.projectId) {
      query = query.eq('project_id', options.projectId);
    }

    // 排序
    const sortBy = options?.sortBy || 'created_at';
    const sortOrder = options?.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // 分页
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      orders: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('获取所有订单失败:', error);
    throw error;
  }
}

/**
 * 获取平台订单统计
 */
export async function getPlatformOrderStats(): Promise<{
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  today_orders: number;
  today_revenue: number;
}> {
  try {
    const { data, error } = await supabase.rpc('get_platform_order_stats');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('获取平台订单统计失败:', error);
    throw error;
  }
}
