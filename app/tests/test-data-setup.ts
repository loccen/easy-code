import { createClient } from '@supabase/supabase-js';

// 创建Supabase客户端的函数
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// 测试用户数据
export const testUsers = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123',
    username: 'admin',
    role: 'admin'
  },
  seller: {
    email: 'seller@example.com',
    password: 'seller123',
    username: 'testseller',
    role: 'seller'
  },
  buyer: {
    email: 'buyer@example.com',
    password: 'buyer123',
    username: 'testbuyer',
    role: 'buyer'
  }
};

// 测试项目数据
export const testProjects = [
  {
    title: 'React电商项目',
    description: '基于React和Node.js的完整电商解决方案',
    price: 299,
    category: 'Web应用',
    tech_stack: ['React', 'Node.js', 'MongoDB'],
    status: 'approved',
    is_dockerized: true
  },
  {
    title: 'Vue管理系统',
    description: '企业级Vue.js管理后台模板',
    price: 199,
    category: '管理系统',
    tech_stack: ['Vue.js', 'Element UI', 'MySQL'],
    status: 'approved',
    is_dockerized: false
  },
  {
    title: '微信小程序商城',
    description: '功能完整的微信小程序电商系统',
    price: 399,
    category: '小程序',
    tech_stack: ['微信小程序', 'Node.js', 'MySQL'],
    status: 'pending_review',
    is_dockerized: true
  }
];

// 测试分类数据
export const testCategories = [
  {
    name: 'Web应用',
    description: 'Web应用程序和网站项目',
    slug: 'web-apps'
  },
  {
    name: '管理系统',
    description: '企业管理和后台系统',
    slug: 'admin-systems'
  },
  {
    name: '小程序',
    description: '微信小程序和移动应用',
    slug: 'mini-programs'
  },
  {
    name: '移动应用',
    description: 'iOS和Android移动应用',
    slug: 'mobile-apps'
  }
];

/**
 * 创建测试用户
 */
export async function createTestUsers() {
  console.log('创建测试用户...');
  const supabase = getSupabaseClient();

  for (const [, userData] of Object.entries(testUsers)) {
    try {
      // 创建认证用户
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });

      if (authError) {
        console.log(`用户 ${userData.email} 可能已存在:`, authError.message);
        continue;
      }

      if (authData.user) {
        // 创建用户资料
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            id: authData.user.id,
            email: userData.email,
            username: userData.username,
            role: userData.role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error(`创建用户资料失败 ${userData.email}:`, profileError);
        } else {
          console.log(`✓ 创建用户: ${userData.email}`);

          // 为买家用户添加测试积分
          if (userData.role === 'buyer') {
            try {
              await supabase.rpc('add_user_credits', {
                p_user_id: authData.user.id,
                p_amount: 1000,
                p_transaction_type: 'admin_adjust',
                p_description: '测试环境初始积分',
                p_reference_type: 'test'
              });
              console.log(`✓ 为用户 ${userData.email} 添加测试积分`);
            } catch (creditError) {
              console.error(`添加测试积分失败 ${userData.email}:`, creditError);
            }
          }
        }
      }
    } catch (error) {
      console.error(`创建用户失败 ${userData.email}:`, error);
    }
  }
}

/**
 * 创建测试分类
 */
export async function createTestCategories() {
  console.log('创建测试分类...');
  const supabase = getSupabaseClient();

  for (const category of testCategories) {
    try {
      const { error } = await supabase
        .from('categories')
        .upsert(category, { onConflict: 'slug' });

      if (error) {
        console.error(`创建分类失败 ${category.name}:`, error);
      } else {
        console.log(`✓ 创建分类: ${category.name}`);
      }
    } catch (error) {
      console.error(`创建分类失败 ${category.name}:`, error);
    }
  }
}

/**
 * 创建测试项目
 */
export async function createTestProjects() {
  console.log('创建测试项目...');
  const supabase = getSupabaseClient();

  // 获取卖家用户ID
  const { data: sellerUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', testUsers.seller.email)
    .single();

  if (!sellerUser) {
    console.error('找不到卖家用户，无法创建测试项目');
    return;
  }

  // 获取分类ID映射
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name');

  const categoryMap = new Map(categories?.map(cat => [cat.name, cat.id]) || []);

  for (const project of testProjects) {
    try {
      const categoryId = categoryMap.get(project.category);
      if (!categoryId) {
        console.error(`找不到分类: ${project.category}`);
        continue;
      }

      const { error } = await supabase
        .from('projects')
        .upsert({
          title: project.title,
          description: project.description,
          price: project.price,
          category_id: categoryId,
          seller_id: sellerUser.id,
          tech_stack: project.tech_stack,
          status: project.status,
          is_dockerized: project.is_dockerized,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error(`创建项目失败 ${project.title}:`, error);
      } else {
        console.log(`✓ 创建项目: ${project.title}`);
      }
    } catch (error) {
      console.error(`创建项目失败 ${project.title}:`, error);
    }
  }
}

/**
 * 清理测试数据
 */
export async function cleanupTestData() {
  console.log('清理测试数据...');
  const supabase = getSupabaseClient();

  try {
    // 删除测试项目
    await supabase
      .from('projects')
      .delete()
      .in('title', testProjects.map(p => p.title));

    // 删除测试分类
    await supabase
      .from('categories')
      .delete()
      .in('slug', testCategories.map(c => c.slug));

    // 删除测试用户资料
    const testEmails = Object.values(testUsers).map(u => u.email);
    await supabase
      .from('users')
      .delete()
      .in('email', testEmails);

    // 删除认证用户
    for (const userData of Object.values(testUsers)) {
      try {
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find(u => u.email === userData.email);
        if (user) {
          await supabase.auth.admin.deleteUser(user.id);
        }
      } catch (error) {
        console.log(`删除认证用户失败 ${userData.email}:`, error);
      }
    }

    console.log('✓ 测试数据清理完成');
  } catch (error) {
    console.error('清理测试数据失败:', error);
  }
}

/**
 * 设置完整的测试环境
 */
export async function setupTestEnvironment() {
  console.log('设置测试环境...');
  
  // 先清理可能存在的旧数据
  await cleanupTestData();
  
  // 创建新的测试数据
  await createTestUsers();
  await createTestCategories();
  await createTestProjects();
  
  console.log('✓ 测试环境设置完成');
}

/**
 * 验证测试环境
 */
export async function verifyTestEnvironment() {
  console.log('验证测试环境...');
  const supabase = getSupabaseClient();

  // 检查用户
  const { data: users } = await supabase
    .from('users')
    .select('email, role')
    .in('email', Object.values(testUsers).map(u => u.email));
  
  console.log(`✓ 找到 ${users?.length || 0} 个测试用户`);
  
  // 检查分类
  const { data: categories } = await supabase
    .from('categories')
    .select('name')
    .in('slug', testCategories.map(c => c.slug));
  
  console.log(`✓ 找到 ${categories?.length || 0} 个测试分类`);
  
  // 检查项目
  const { data: projects } = await supabase
    .from('projects')
    .select('title, status')
    .in('title', testProjects.map(p => p.title));
  
  console.log(`✓ 找到 ${projects?.length || 0} 个测试项目`);
  
  return {
    users: users?.length || 0,
    categories: categories?.length || 0,
    projects: projects?.length || 0
  };
}
